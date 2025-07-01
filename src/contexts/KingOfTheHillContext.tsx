import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useMetaMask } from '../hooks/useMetaMask';
import { KingOfTheHillService } from '../utils/kingOfTheHill';
import { contractAddress, networkRpcUrl } from '../config';
import { ethers } from 'ethers';

interface KingOfTheHillContextType {
  currentKing: string;
  currentPrize: bigint;
  pendingWithdrawal: bigint;
  totalClaims: bigint;
  claimCount: bigint;
  feePercentage: bigint;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  service: KingOfTheHillService | null;
  claimThrone: (amount: string) => Promise<void>;
  withdraw: () => Promise<void>;
  refreshData: () => void;
}

const KingOfTheHillContext = createContext<KingOfTheHillContextType | undefined>(undefined);

// Helper function to format errors
const formatError = (err: any): string => {
  if (typeof err === 'string') return err;
  
  const errorMessage = err?.message || 'Unknown error occurred';
  
  // Handle common blockchain errors
  if (errorMessage.includes('Too Many Requests') || errorMessage.includes('-32005')) {
    return 'Network is busy. Please try again in a moment.';
  }
  
  if (errorMessage.includes('missing response')) {
    return 'Connection issue with blockchain network. Please try again.';
  }
  
  if (errorMessage.includes('network changed')) {
    return 'Network changed. Please make sure you are connected to Sepolia testnet.';
  }
  
  if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
    return 'Transaction rejected by user.';
  }
  
  // Truncate long error messages
  return errorMessage.length > 100 
    ? 'Error connecting to blockchain. Please try again later.' 
    : errorMessage;
};

export const KingOfTheHillProvider = ({ children }: { children: ReactNode }) => {
  const { provider, signer, account, error: metaMaskError } = useMetaMask();
  
  const [service, setService] = useState<KingOfTheHillService | null>(null);
  const [currentKing, setCurrentKing] = useState<string>('');
  const [currentPrize, setCurrentPrize] = useState<bigint>(BigInt(0));
  const [pendingWithdrawal, setPendingWithdrawal] = useState<bigint>(BigInt(0));
  const [totalClaims, setTotalClaims] = useState<bigint>(BigInt(0));
  const [claimCount, setClaimCount] = useState<bigint>(BigInt(0));
  const [feePercentage, setFeePercentage] = useState<bigint>(BigInt(0));
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Effect for service initialization
  useEffect(() => {
    const initializeService = async () => {
      try {
        // If MetaMask is available, use it
        if (provider) {
          const serviceInstance = new KingOfTheHillService(contractAddress, provider, signer);
          setService(serviceInstance);
        } 
        // If MetaMask is not available or there's an error, create a read-only provider
        else {
          if (!networkRpcUrl) {
            setError("No RPC URL available to connect to the blockchain.");
            setIsLoading(false);
            return;
          }
          
          try {
            // Create a fallback provider using the RPC URL from config
            const fallbackProvider = new ethers.JsonRpcProvider(networkRpcUrl);
            
            // Test the provider connection
            await fallbackProvider.getNetwork();
            
            const readOnlyService = new KingOfTheHillService(contractAddress, fallbackProvider);
            setService(readOnlyService);
          } catch (err) {
            setError(formatError(err));
            setIsLoading(false);
          }
        }
      } catch (err) {
        setError(formatError(err));
        setIsLoading(false);
      }
    };
    
    initializeService();

    // Cleanup function
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [provider, signer, metaMaskError]);

  const refreshData = useCallback(async () => {
    if (!service) return;

    setIsRefreshing(true);
    setError(null);
    try {
      // Fetch general data with sequential calls to avoid rate limiting
      const king = await service.getCurrentKing();
      setCurrentKing(king);
      
      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const prize = await service.getCurrentPrize();
      setCurrentPrize(prize);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const claims = await service.getTotalClaims();
      setTotalClaims(claims);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fee = await service.getFeePercentage();
      setFeePercentage(fee);

      // Fetch user-specific data if connected
      if (account) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userClaims = await service.getClaimCount(account);
        setClaimCount(userClaims);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userWithdrawal = await service.getPendingWithdrawal(account);
        setPendingWithdrawal(userWithdrawal);
      } else {
        setClaimCount(BigInt(0));
        setPendingWithdrawal(BigInt(0));
      }
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [service, account]);

  useEffect(() => {
    if (service) {
      refreshData();
      
      // Set up an interval to refresh data periodically
      // Use a longer interval to avoid rate limiting
      const interval = window.setInterval(refreshData, 30000); // every 30 seconds
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [service, refreshData]);

  useEffect(() => {
      // Only set error for critical MetaMask errors, not for "not installed"
      if (metaMaskError && metaMaskError !== 'MetaMask is not installed.') {
          setError(formatError(metaMaskError));
          setIsLoading(false);
      } else if (metaMaskError === 'MetaMask is not installed.') {
          // Just stop loading but don't set error
          setIsLoading(false);
      }
  }, [metaMaskError]);


  const claimThrone = async (amount: string) => {
    if (!service || !signer) throw new Error("Service or signer not available.");
    // Ensure service has the latest signer
    service.updateSigner(signer);
    const tx = await service.claimThrone(amount);
    await tx.wait();
    await refreshData();
  };

  const withdraw = async () => {
    if (!service || !signer) throw new Error("Service or signer not available.");
    service.updateSigner(signer);
    const tx = await service.withdraw();
    await tx.wait();
    await refreshData();
  };

  const contextValue = {
    currentKing,
    currentPrize,
    pendingWithdrawal,
    totalClaims,
    claimCount,
    feePercentage,
    isLoading,
    isRefreshing,
    error: error || metaMaskError,
    service,
    claimThrone,
    withdraw,
    refreshData,
  };

  return (
    <KingOfTheHillContext.Provider value={contextValue}>
      {children}
    </KingOfTheHillContext.Provider>
  );
};

export const useKingOfTheHill = () => {
  const context = useContext(KingOfTheHillContext);
  if (context === undefined) {
    throw new Error('useKingOfTheHill must be used within a KingOfTheHillProvider');
  }
  return context;
}; 
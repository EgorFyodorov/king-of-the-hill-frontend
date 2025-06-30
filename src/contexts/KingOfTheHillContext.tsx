import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useMetaMask } from '../hooks/useMetaMask';
import { KingOfTheHillService } from '../utils/kingOfTheHill';
import { contractAddress } from '../config';

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

  useEffect(() => {
    if (provider) {
      const serviceInstance = new KingOfTheHillService(contractAddress, provider, signer);
      setService(serviceInstance);
    } else {
      setService(null);
    }
  }, [provider, signer]);

  const refreshData = useCallback(async () => {
    if (!service) return;

    setIsRefreshing(true);
    setError(null);
    try {
      // Fetch general data
      const [king, prize, claims, fee] = await Promise.all([
        service.getCurrentKing(),
        service.getCurrentPrize(),
        service.getTotalClaims(),
        service.getFeePercentage(),
      ]);
      setCurrentKing(king);
      setCurrentPrize(prize);
      setTotalClaims(claims);
      setFeePercentage(fee);

      // Fetch user-specific data if connected
      if (account) {
        const [userClaims, userWithdrawal] = await Promise.all([
          service.getClaimCount(account),
          service.getPendingWithdrawal(account),
        ]);
        setClaimCount(userClaims);
        setPendingWithdrawal(userWithdrawal);
      } else {
        setClaimCount(BigInt(0));
        setPendingWithdrawal(BigInt(0));
      }
    } catch (e: any) {
      console.error("Failed to refresh contract data:", e);
      setError("Could not fetch data from contract. Are you on the right network?");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [service, account]);

  useEffect(() => {
    if (service) {
      refreshData();
      // Optional: Set up an interval to refresh data periodically
      const interval = setInterval(refreshData, 15000); // every 15 seconds
      return () => clearInterval(interval);
    }
  }, [service]);

  useEffect(() => {
      if (metaMaskError) {
          setError(metaMaskError);
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
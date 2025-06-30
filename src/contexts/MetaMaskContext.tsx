import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

interface MetaMaskContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  account: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

export const MetaMaskProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
      setError('Please connect to MetaMask.');
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      if (provider) {
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
      }
    }
  }, [account, provider]);

  useEffect(() => {
    const initialize = async () => {
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed.');
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      try {
        const accounts = await browserProvider.listAccounts();
        if (accounts.length > 0) {
          await handleAccountsChanged(accounts.map(a => a.address));
        }
      } catch (err) {
        console.error('Error fetching initial accounts:', err);
        setError('An error occurred while checking for connected accounts.');
      }

      window.ethereum.on('accountsChanged', (accounts: string[]) => handleAccountsChanged(accounts));
      window.ethereum.on('chainChanged', () => window.location.reload());
    };

    initialize();

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => window.location.reload());
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (!provider) {
      setError('MetaMask is not available.');
      return;
    }

    if (isConnecting) return;

    setIsConnecting(true);
    setError(null);
    try {
      const newSigner = await provider.getSigner();
      setSigner(newSigner);
      setAccount(newSigner.address);
    } catch (err: any) {
      console.error('Error connecting to MetaMask:', err);
      if (err.code === -32002) {
        setError('Connection request already pending. Please check MetaMask.');
      } else if (err.code === 4001) {
        setError('Connection rejected by user.');
      } else {
        setError('Failed to connect wallet.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [provider, isConnecting]);

  const contextValue = {
    provider,
    signer,
    account,
    isConnecting,
    error,
    connect,
  };

  return (
    <MetaMaskContext.Provider value={contextValue}>
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = () => {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
}; 
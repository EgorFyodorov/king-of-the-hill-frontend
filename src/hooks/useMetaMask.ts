import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NETWORK } from '../config';

export const useMetaMask = () => {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // Initialize provider and try to get accounts on mount
  useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(browserProvider);

            const getAccountsAndSigner = async () => {
                try {
                    const accounts = await browserProvider.listAccounts();
                    if (accounts.length > 0 && accounts[0]) {
                        setAccount(accounts[0].address);
                        setSigner(accounts[0]);
                    }
                } catch (err) {
                    console.error("Error fetching initial accounts:", err);
                    setError("An error occurred while checking for connected accounts.");
                }
            };

            getAccountsAndSigner();

            // Listen for account changes
            window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
                if (newAccounts.length > 0 && newAccounts[0]) {
                    setAccount(newAccounts[0]);
                    // Re-fetch signer for the new account
                    browserProvider.getSigner().then(setSigner);
                } else {
                    setAccount(null);
                    setSigner(null);
                    setError(null);
                }
            });
        } else {
            setError('MetaMask is not installed. Please install it to use this app.');
      }
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
            console.error("Error connecting to MetaMask:", err);
            if (err.code === -32002) {
                setError("Connection request already pending. Please check MetaMask.");
            } else if (err.code === 4001) {
                setError("Connection rejected by user.");
            } else {
                setError("Failed to connect wallet.");
            }
        } finally {
            setIsConnecting(false);
        }
    }, [provider, isConnecting]);

    return { provider, signer, account, isConnecting, error, connect };
}; 
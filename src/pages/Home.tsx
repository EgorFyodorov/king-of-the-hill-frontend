import React, { useState, useEffect } from 'react';
import { useKingOfTheHill } from '../contexts/KingOfTheHillContext';
import { useMetaMask } from '../hooks/useMetaMask';
import { ethers } from 'ethers';

const ICONS = {
  king: '👑',
  prize: '🪙',
  fee: '↗️',
  claims: '🔢',
  address: '👛',
  yourClaims: '🏆',
  pending: '💰',
};

const Home: React.FC = () => {
  const { account, error: metaMaskError, connect, isConnecting } = useMetaMask();
  const {
    currentKing,
    currentPrize,
    pendingWithdrawal,
    totalClaims,
    claimCount,
    feePercentage,
    isLoading,
    isRefreshing,
    error: contractError,
    service,
    refreshData,
    withdraw,
    claimThrone,
  } = useKingOfTheHill();
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [minBid, setMinBid] = useState<string>('0');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Calculate minimum bid whenever prize or fee changes
  useEffect(() => {
    if (currentPrize !== null && feePercentage !== null) {
      const minPrize = currentPrize;
      const calculatedMinBid = minPrize + (minPrize * feePercentage) / BigInt(10000);
      setMinBid(ethers.formatEther(calculatedMinBid));
    }
  }, [currentPrize, feePercentage]);

  // Auto-retry on error
  useEffect(() => {
    if (contractError && contractError.includes('Network is busy') && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        refreshData();
      }, 3000); // Retry after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [contractError, refreshData, retryCount]);

  const handleClaimThrone = async () => {
    if (!service) {
      setTransactionError('Service not initialized.');
      return;
    }
    if (!bidAmount) {
      setTransactionError('Please enter a bid amount.');
      return;
    }

    try {
      setIsClaiming(true);
      setTransactionError(null);

      const bidValue = ethers.parseEther(bidAmount);
      const minBidValue = ethers.parseEther(minBid);
      
      if (bidValue <= minBidValue) {
        throw new Error(`Your bid must be greater than the minimum of ${minBid} ETH.`);
      }
      
      await claimThrone(bidAmount);
      
      setBidAmount(''); // Clear input on success
    } catch (error: any) {
      console.error('Error claiming throne:', error);
      if (error?.code === 'INSUFFICIENT_FUNDS') {
        setTransactionError('Insufficient funds to complete the transaction.');
      } else if (error?.code === 4001 || (error?.message && (error.message.includes('user rejected transaction') || error.message.includes('User denied transaction signature')))) {
        setTransactionError('Transaction rejected by user.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setTransactionError(errorMessage.length > 100 ? 'An unknown error occurred.' : errorMessage);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleWithdraw = async () => {
    if (!service) {
      console.error('Withdraw failed: service not available');
      return;
    }
    try {
      setTransactionError(null);
      await withdraw();
    } catch (error: any) {
      console.error('Error withdrawing funds:', error);
      if (error?.code === 'INSUFFICIENT_FUNDS') {
        setTransactionError('Insufficient funds for gas fees.');
      } else if (error?.code === 4001 || (error?.message && (error.message.includes('user rejected transaction') || error.message.includes('User denied transaction signature')))) {
        setTransactionError('Transaction rejected by user.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setTransactionError(errorMessage.length > 100 ? 'An unknown error occurred.' : errorMessage);
      }
    }
  };

  // Modal window for instruction
  const HowToPlayModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white/95 rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-700 text-xl font-bold hover:text-red-500 transition"
          onClick={() => setShowHowToPlay(false)}
        >
          ×
        </button>
        <h2 className="text-3xl font-extrabold mb-4 text-purple-900">How to Play</h2>
        <div className="space-y-4 text-gray-800">
          <p>
            Welcome to King of the Hill! This is a game where you can become the king by making the highest bid.
            Here's how it works:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>To become the king, you need to bid more than the current prize plus a 5% fee</li>
            <li>When you make a bid, 5% goes to the contract owner, and the rest goes to the previous king</li>
            <li>The previous king can withdraw their winnings at any time using the "Withdraw Funds" button</li>
            <li>Each new bid must be higher than the previous one plus 5% fee</li>
            <li>You can see your pending withdrawals and claim count in the "Your Status" section</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            Note: When you make a bid, the previous king will receive your full bid amount minus the 5% fee.
            For example, if you bid 1.1 ETH, the previous king will receive 1.045 ETH (1.1 ETH - 5% fee).
            This ensures that the previous king always receives more than they bid.
          </p>
        </div>
      </div>
    </div>
  );

  // Show loading state
  if (isLoading) {
    return <div className="flex items-center justify-center h-full min-h-screen bg-gradient-to-br from-purple-950 via-purple-800 to-purple-500">
      <div className="text-white text-2xl">Loading...</div>
    </div>;
  }

  // Show error state, but not for MetaMask not installed error
  if (contractError && contractError !== metaMaskError && !contractError.includes('Network is busy')) {
    return <div className="flex items-center justify-center h-full min-h-screen bg-gradient-to-br from-purple-950 via-purple-800 to-purple-500">
      <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-6 max-w-md w-full text-center">
        <div className="text-white text-xl mb-4">Error: {contractError}</div>
        <button 
          onClick={() => {
            setRetryCount(0);
            refreshData();
          }}
          className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-purple-900 font-bold py-3 px-7 rounded-lg shadow-lg transform transition hover:scale-105 text-base border-2 border-yellow-300"
        >
          Retry
        </button>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-800 to-purple-500 flex flex-col">
      {showHowToPlay && <HowToPlayModal />}
      <div className="flex-1 flex flex-col justify-center items-center px-2 py-8">
        <h1 className="text-5xl font-extrabold text-center mb-8 text-white drop-shadow-lg tracking-wide">King of the Hill</h1>
        
        <div className="max-w-5xl w-full mb-8">
          <div className="flex justify-center">
            <div className="w-[calc(50%-1px)] flex justify-end pr-2">
              {metaMaskError ? (
                <div className="bg-white/10 border border-white/20 rounded-xl shadow-lg p-4 h-12 flex items-center gap-3">
                  <div className="text-lg font-bold text-yellow-300">MetaMask Required</div>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-purple-900 font-bold py-2 px-4 rounded-lg shadow-lg transform transition hover:scale-105 text-sm border-2 border-yellow-300"
                  >
                    Install MetaMask
                  </a>
                </div>
              ) : (
                <button
                  onClick={connect}
                  disabled={!!account || isConnecting}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-purple-900 font-extrabold py-3 px-7 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 text-lg border-2 border-yellow-300 h-12 flex items-center justify-center"
                >
                  {account ? 'Wallet Connected' : (isConnecting ? 'Connecting...' : 'Connect Wallet')}
                </button>
              )}
            </div>
            <div className="w-[calc(50%-1px)] flex justify-start pl-2">
              <button
                className="px-7 py-3 rounded-lg bg-white/20 text-white hover:bg-white/30 transition font-semibold text-lg border border-white/30 h-12 flex items-center justify-center"
                onClick={() => setShowHowToPlay(true)}
              >
                How to Play
              </button>
            </div>
          </div>
        </div>
        
        {/* Show network busy warning if applicable */}
        {contractError && contractError.includes('Network is busy') && (
          <div className="max-w-5xl w-full mb-6">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
              <p className="text-yellow-200 text-sm">
                {contractError} {retryCount > 0 ? `(Retry attempt ${retryCount}/3)` : ''}
              </p>
            </div>
          </div>
        )}
        
        <div className="max-w-5xl w-full flex flex-col md:flex-row gap-10">
          {/* Current King */}
          <div className="flex-1 min-w-[336px] max-w-xl bg-white/10 border border-white/20 rounded-2xl shadow-xl p-8 mb-6 md:mb-0">
            <h2 className="text-xl font-bold mb-4 text-yellow-300 flex items-center gap-2">
              <span className="text-2xl">{ICONS.king}</span> Current King
            </h2>
            <div className="space-y-3 text-base">
              <div className="flex items-center gap-2">
                <span className="text-lg">{ICONS.king}</span>
                <div className="flex flex-col items-start w-full mb-2">
                  <span className="text-xs font-bold text-white/70 mb-1">King address:</span>
                  <span className="text-base text-white/90 truncate w-full max-w-full overflow-x-auto whitespace-nowrap" title={currentKing}>{currentKing}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{ICONS.prize}</span>
                <span className="font-bold text-white/90">Current Prize:</span>
                <span className="text-lg text-yellow-200 font-bold">{currentPrize ? ethers.formatEther(currentPrize.toString()) : '0'} ETH</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">{ICONS.fee}</span>
                <span className="font-bold text-white/90">Fee:</span>
                <span className="text-lg text-white/80 font-bold">{feePercentage ? Number(feePercentage) / 100 : '0'}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">{ICONS.claims}</span>
                <span className="font-bold text-white/90">Total Claims:</span>
                <span className="text-lg text-white/80 font-bold">{totalClaims?.toString() || '0'}</span>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-2 text-yellow-200">Actions</h2>
              <div className="mb-3 flex flex-row items-center gap-2 justify-center">
                <label className="text-base font-bold text-white/80 whitespace-nowrap mr-2 flex-shrink-0">Bid Amount (ETH)</label>
                <input
                  type="number"
                  step="0.000000000000000001"
                  min={minBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.0"
                  className="shadow appearance-none border border-yellow-200 rounded py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-400 w-40 text-base min-w-0 h-10"
                />
                <button
                  onClick={handleClaimThrone}
                  disabled={!account || isClaiming || isRefreshing || !bidAmount || Number(bidAmount) <= Number(minBid)}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-purple-900 font-bold py-2 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 text-base border-2 border-yellow-300 h-10 min-w-[120px] whitespace-nowrap text-center flex justify-center items-center"
                >
                  {isClaiming ? 'Sending...' : isRefreshing ? 'Refreshing...' : 'Claim Throne'}
                </button>
              </div>
              <p className="text-xs text-gray-200 mt-1 truncate max-w-full" title={minBid || ''}>
                Bid must be greater than {minBid} ETH (current prize + fee)
              </p>
            </div>
          </div>
          {/* Your Status */}
          <div className="flex-1 min-w-[336px] max-w-xl bg-white/10 border border-white/20 rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold mb-4 text-blue-200 flex items-center gap-2">
              <span className="text-2xl">{ICONS.address}</span> Your Status
            </h2>
            <div className="space-y-3 text-base">
              <div className="flex items-center gap-2">
                <span className="text-lg">{ICONS.address}</span>
                <div className="flex flex-col items-start w-full mb-2">
                  <span className="text-xs font-bold text-white/70 mb-1">Your Address:</span>
                  <span className="text-base text-white/90 truncate w-full max-w-full overflow-x-auto whitespace-nowrap" title={account || ''}>{account}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{ICONS.yourClaims}</span>
                <span className="font-bold text-white/90">Your Claims:</span>
                <span className="text-lg text-blue-100 font-bold">{claimCount?.toString() || '0'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{ICONS.pending}</span>
                <span className="font-bold text-white/90">Pending Withdrawals:</span>
                <span className="text-lg text-green-200 font-bold">{pendingWithdrawal ? ethers.formatEther(pendingWithdrawal.toString()) : '0'} ETH</span>
              </div>
            </div>
            <div className="flex flex-row justify-center items-center gap-4 mt-8">
              <button
                onClick={handleWithdraw}
                disabled={!account || isClaiming || isRefreshing || pendingWithdrawal === BigInt(0)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-purple-900 font-bold py-3 px-7 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 text-base border-2 border-yellow-300 flex items-center justify-center"
              >
                Withdraw Funds
              </button>
            </div>
            {transactionError && (
              <div className="mt-4 text-center">
                <p className="text-red-400 bg-red-900/50 rounded-lg p-3 text-sm">{transactionError}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-center text-white/70 text-sm">
          <div className="flex justify-center gap-4 items-center">
            <a 
              href="https://github.com/EgorFyodorov/king-of-the-hill-contracts" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <a 
              href="https://sepolia.etherscan.io/address/0x8F03Df8600B02D3699Be042E3eE1C49968F65FE2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4 inline-block align-middle" viewBox="0 0 122 122" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.29 57.9139C25.2901 57.2347 25.4244 56.5623 25.6851 55.9352C25.9458 55.308 26.3278 54.7386 26.8092 54.2595C27.2907 53.7804 27.8619 53.4011 28.4903 53.1434C29.1187 52.8858 29.7918 52.7548 30.471 52.7579L39.061 52.7859C40.4305 52.7859 41.744 53.33 42.7124 54.2984C43.6809 55.2669 44.225 56.5803 44.225 57.9499V90.4299C45.192 90.1429 46.434 89.8369 47.793 89.5169C48.737 89.2952 49.5783 88.761 50.1805 88.0009C50.7826 87.2409 51.1102 86.2996 51.11 85.3299V45.0399C51.11 43.6702 51.654 42.3567 52.6224 41.3881C53.5908 40.4195 54.9043 39.8752 56.274 39.8749H64.881C66.2506 39.8752 67.5641 40.4195 68.5325 41.3881C69.5009 42.3567 70.045 43.6702 70.045 45.0399V82.4329C70.045 82.4329 72.2 81.5609 74.299 80.6749C75.0787 80.3452 75.7441 79.7931 76.2122 79.0877C76.6803 78.3822 76.9302 77.5545 76.931 76.7079V32.1299C76.931 30.7605 77.4749 29.4472 78.4431 28.4788C79.4113 27.5103 80.7245 26.9662 82.0939 26.9659H90.701C92.0706 26.9659 93.384 27.51 94.3525 28.4784C95.3209 29.4468 95.865 30.7603 95.865 32.1299V68.8389C103.327 63.4309 110.889 56.9269 116.89 49.1059C117.761 47.9707 118.337 46.6377 118.567 45.2257C118.797 43.8138 118.674 42.3668 118.209 41.0139C115.431 33.0217 111.016 25.6973 105.245 19.5096C99.474 13.3218 92.4749 8.40687 84.6955 5.07934C76.9161 1.75182 68.5277 0.0849617 60.0671 0.185439C51.6065 0.285917 43.2601 2.15152 35.562 5.66286C27.8638 9.17419 20.9834 14.2539 15.3611 20.577C9.73881 26.9001 5.49842 34.3272 2.91131 42.3832C0.324207 50.4391 -0.552649 58.9464 0.336851 67.3607C1.22635 75.775 3.86263 83.911 8.07696 91.2479C8.81111 92.5135 9.89118 93.5434 11.1903 94.2165C12.4894 94.8896 13.9536 95.178 15.411 95.0479C17.039 94.9049 19.066 94.7019 21.476 94.4189C22.5251 94.2998 23.4937 93.7989 24.1972 93.0116C24.9008 92.2244 25.2901 91.2058 25.291 90.1499L25.29 57.9139Z" fill="currentColor"/>
                <path d="M25.1021 110.009C34.1744 116.609 44.8959 120.571 56.0802 121.456C67.2646 122.34 78.4757 120.114 88.4731 115.022C98.4705 109.93 106.864 102.172 112.726 92.6059C118.587 83.0395 121.688 72.0381 121.685 60.8188C121.685 59.4188 121.62 58.0337 121.527 56.6567C99.308 89.7947 58.2831 105.287 25.104 110.004" fill="currentColor"/>
              </svg>
              Etherscan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 
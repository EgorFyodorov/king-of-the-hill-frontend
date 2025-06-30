// Network configuration
export const NETWORK = {
  name: import.meta.env.VITE_NETWORK_NAME,
  chainId: Number(import.meta.env.VITE_CHAIN_ID),
  rpcUrl: import.meta.env.VITE_RPC_URL
};

// Contract configuration
export const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export const contractABI = [
  "function king() view returns (address)",
  "function currentPrize() view returns (uint256)",
  "function pendingWithdrawals(address) view returns (uint256)",
  "function claimThrone() payable",
  "function withdraw()",
  "function totalClaims() view returns (uint256)",
  "function claimCount(address) view returns (uint256)",
  "function feePercentage() view returns (uint256)",
  "event ThroneClaimed(address indexed previousKing, address indexed newKing, uint256 amount)",
  "event FeePercentageUpdated(uint256 oldFee, uint256 newFee)"
]; 
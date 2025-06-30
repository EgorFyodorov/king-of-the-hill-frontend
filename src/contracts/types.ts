import { ethers } from 'ethers';

export interface IKingOfTheHill {
  king(): Promise<string>;
  currentPrize(): Promise<bigint>;
  pendingWithdrawals(address: string): Promise<bigint>;
  claimThrone(overrides?: { value?: bigint }): Promise<ethers.ContractTransactionResponse>;
  withdraw(): Promise<ethers.ContractTransactionResponse>;
  totalClaims(): Promise<bigint>;
  claimCount(address: string): Promise<bigint>;
  feePercentage(): Promise<bigint>;
  on(event: 'ThroneClaimed', listener: (previousKing: string, newKing: string, amount: bigint) => void): void;
  on(event: 'FeePercentageUpdated', listener: (oldFee: bigint, newFee: bigint) => void): void;
}

export const KingOfTheHillABI = [
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
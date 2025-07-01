import { ethers } from 'ethers';
import { KingOfTheHillABI, IKingOfTheHill } from '../contracts/types';

export class KingOfTheHillService {
    private contract: IKingOfTheHill & ethers.Contract;
    private provider: ethers.Provider;
    private signer: ethers.Signer | null;

  constructor(
        contractAddress: string,
        provider: ethers.Provider,
        signer: ethers.Signer | null = null
    ) {
        this.provider = provider;
        this.signer = signer;
        
        // Check that the contract is deployed
        this.checkContractDeployment(contractAddress, provider);

        // Create a contract instance with the correct ABI
        this.contract = new ethers.Contract(
            contractAddress,
            KingOfTheHillABI,
            signer || provider
        ) as IKingOfTheHill & ethers.Contract;
    }

    private async checkContractDeployment(address: string, provider: ethers.Provider) {
        try {
            // Check contract code
            const code = await provider.getCode(address);
            
            if (code === '0x') {
                throw new Error('No contract deployed at this address');
            }

            // Check network
            await provider.getNetwork();

            // Check if we can call a simple method
            const contract = new ethers.Contract(address, ['function king() view returns (address)'], provider);
            try {
                await contract.king();
            } catch (err) {
                console.error('Error calling king():', err);
            }
        } catch (err) {
            console.error('Error checking contract deployment:', err);
            throw err;
        }
    }

    updateSigner(signer: ethers.Signer) {
        this.signer = signer;
        this.contract = this.contract.connect(signer) as IKingOfTheHill & ethers.Contract;
    }

    // Public view methods
    async getCurrentKing(): Promise<string> {
        return this.contract.king();
    }

    async getCurrentPrize(): Promise<bigint> {
        return this.contract.currentPrize();
    }

    async getTotalClaims(): Promise<bigint> {
        return this.contract.totalClaims();
    }

    async getFeePercentage(): Promise<bigint> {
        return this.contract.feePercentage();
    }

    // User-specific view methods
    async getClaimCount(address: string): Promise<bigint> {
        return this.contract.claimCount(address);
    }

    async getPendingWithdrawal(address: string): Promise<bigint> {
        return this.contract.pendingWithdrawals(address);
    }

    // Transaction methods
    async claimThrone(amount: string): Promise<ethers.ContractTransactionResponse> {
        if (!this.signer) throw new Error("Signer is not available. Please connect your wallet.");
        const contractWithSigner = this.contract.connect(this.signer) as IKingOfTheHill & ethers.Contract;
        const tx = await contractWithSigner.claimThrone({ value: ethers.parseEther(amount) });
        return tx;
    }

    async withdraw(): Promise<ethers.ContractTransactionResponse> {
        if (!this.signer) throw new Error("Signer is not available. Please connect your wallet.");
        const contractWithSigner = this.contract.connect(this.signer) as IKingOfTheHill & ethers.Contract;
        const tx = await contractWithSigner.withdraw();
        return tx;
    }

    // Event listeners
    onKingChanged(callback: (previousKing: string, newKing: string, amount: bigint) => void) {
        this.contract.on('ThroneClaimed', callback);
    }

    onFeePercentageUpdated(callback: (oldFee: bigint, newFee: bigint) => void) {
        this.contract.on('FeePercentageUpdated', callback);
    }
}

// Example usage:
/*
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const kingOfTheHill = new KingOfTheHillService(
    '0x...', // contract address
    provider,
    signer
);

// Get current king
const currentKing = await kingOfTheHill.getCurrentKing();
console.log('Current King:', currentKing);

// Get current prize
const currentPrize = await kingOfTheHill.getCurrentPrize();
console.log('Current Prize:', ethers.formatEther(currentPrize), 'ETH');

// Try to claim the throne
try {
    const tx = await kingOfTheHill.claimThrone(ethers.parseEther('2'));
    await tx.wait();
    console.log('You became the king!');
} catch (error) {
    console.error('Error claiming throne:', error);
}

// Withdraw funds
try {
    const tx = await kingOfTheHill.withdraw();
    await tx.wait();
    console.log('Funds withdrawn successfully!');
} catch (error) {
    console.error('Error withdrawing funds:', error);
}

// Subscribe to king changed event
kingOfTheHill.onKingChanged((previousKing, newKing, amount) => {
    console.log('Previous King:', previousKing);
    console.log('New King:', newKing);
    console.log('Amount:', ethers.formatEther(amount), 'ETH');
});
*/ 
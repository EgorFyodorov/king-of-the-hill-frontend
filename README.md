# King of the Hill DApp

A decentralized application where users can compete to become the "king" by making the highest bid. This repository contains the frontend application for the King of the Hill game.

The smart contracts for this project are managed in a separate repository: [king-of-the-hill-contracts](https://github.com/EgorFyodorov/king-of-the-hill-contracts).

## Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Blockchain**: Ethers.js
- **Deployment**: Docker, Nginx

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker and Docker Compose
- MetaMask wallet installed in your browser

## Local Development

Follow these steps to run the application on your local machine for development.

### 1. Clone the Repository

```bash
git clone https://github.com/caxucena/king-of-the-hill-dapp.git
cd king-of-the-hill-dapp
```

### 2. Install Dependencies

This will download all the necessary packages.

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root of the project by copying the example. This file is ignored by Git and should not be committed.

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values. For local development, you'll need to point it to a local blockchain node (like Anvil or Hardhat) and provide the address of the deployed contract.

### 4. Run the Development Server

This command starts the Vite development server with hot-reloading.

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Production & Deployment

The application is designed to be deployed as a Docker container.

### Building and Running with Docker

This is the recommended way to test the production build locally. It simulates the exact environment used for deployment.

1.  **Ensure your `.env` file is configured** for the target network (e.g., Sepolia testnet).
2.  **Build and run the container using Docker Compose:**

    ```bash
    docker-compose up --build
    ```

The application will be running on `http://localhost:80`.

### Continuous Deployment (CD)

A push to the `main` branch will automatically trigger the `.github/workflows/cd.yml` workflow, which builds and pushes the Docker image to DockerHub and deploys it to the server.

## Environment Variables

The application uses the following environment variables, prefixed with `VITE_` as required by Vite:

-   `VITE_NETWORK_NAME`: The name of the target network (e.g., `sepolia`).
-   `VITE_CHAIN_ID`: The chain ID of the target network.
-   `VITE_RPC_URL`: The RPC URL for connecting to the blockchain.
-   `VITE_CONTRACT_ADDRESS`: The deployed address of the King of the Hill smart contract.

For production deployment, these variables are managed as repository secrets in GitHub Actions.
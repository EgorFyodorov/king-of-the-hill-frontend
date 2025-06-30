/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK_NAME: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
  readonly VITE_CONTRACT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 
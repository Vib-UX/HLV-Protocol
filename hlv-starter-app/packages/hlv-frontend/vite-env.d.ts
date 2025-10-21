/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_HEDERA_NETWORK: 'mainnet' | 'testnet' | 'previewnet';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


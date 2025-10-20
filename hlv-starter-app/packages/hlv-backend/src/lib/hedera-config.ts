/**
 * Hedera Network Configuration for HLV Protocol
 *
 * Hedera Testnet chainId: 296 (0x128)
 * Hedera Mainnet chainId: 295 (0x127)
 */

export const HEDERA_NETWORKS = {
  MAINNET: {
    chainId: 295,
    name: "Hedera Mainnet",
    rpcUrl: "https://mainnet.hedera.com",
    explorer: "https://hashscan.io/mainnet",
    nativeCurrency: {
      name: "HBAR",
      symbol: "HBAR",
      decimals: 8,
    },
  },
  TESTNET: {
    chainId: 296,
    name: "Hedera Testnet",
    rpcUrl: "https://testnet.hedera.com",
    explorer: "https://hashscan.io/testnet",
    nativeCurrency: {
      name: "HBAR",
      symbol: "HBAR",
      decimals: 8,
    },
  },
  PREVIEWNET: {
    chainId: 297,
    name: "Hedera Previewnet",
    rpcUrl: "https://previewnet.hedera.com",
    explorer: "https://hashscan.io/previewnet",
    nativeCurrency: {
      name: "HBAR",
      symbol: "HBAR",
      decimals: 8,
    },
  },
} as const;

/**
 * Get Hedera network configuration
 */
export function getHederaNetwork(
  network: "mainnet" | "testnet" | "previewnet"
) {
  return HEDERA_NETWORKS[network.toUpperCase() as keyof typeof HEDERA_NETWORKS];
}

/**
 * HLV Protocol Contract Addresses
 * From contracts/DEPLOYMENT_SUCCESS.md
 */
export const HLV_CONTRACTS = {
  TESTNET: {
    HTLC: process.env.HTLC_CONTRACT_ADDRESS || "0x0", // Update from deployment
    WBTC: process.env.WBTC_TOKEN_ADDRESS || "0x0", // Update with actual wBTC address
  },
  MAINNET: {
    HTLC: "0x0", // TODO: Deploy to mainnet
    WBTC: "0x0", // TODO: Get mainnet wBTC address
  },
} as const;

/**
 * Lightning Network Configuration
 */
export const LIGHTNING_CONFIG = {
  // Conversion rate: 1 wBTC = 100,000,000 sats
  WBTC_TO_SATS: 100_000_000,

  // Default rebalance percentage
  DEFAULT_REBALANCE_PERCENTAGE: 0.2, // 20%

  // Default timelock duration (24 hours)
  DEFAULT_TIMELOCK_SECONDS: 86400,

  // Invoice expiry (24 hours)
  DEFAULT_INVOICE_EXPIRY_SECONDS: 86400,
} as const;

/**
 * Convert wBTC (in wei) to satoshis
 */
export function wbtcToSats(wbtcWei: string): number {
  // wBTC has 8 decimals like BTC
  // 1 wBTC = 10^8 units = 100,000,000 sats
  const wbtcUnits = BigInt(wbtcWei) / BigInt(10 ** 10); // Convert from 18 to 8 decimals
  return Number(wbtcUnits);
}

/**
 * Convert satoshis to wBTC (in wei)
 */
export function satsToWBTC(sats: number): string {
  // Convert sats to wBTC units (8 decimals) then to wei (18 decimals)
  const wbtcUnits = BigInt(sats);
  const wbtcWei = wbtcUnits * BigInt(10 ** 10);
  return wbtcWei.toString();
}

/**
 * Calculate rebalance amount
 *
 * TESTING MODE: Fixed 10 sats (safe for mainnet Lightning)
 * PRODUCTION: Would use 20% of balance
 */
export function calculateRebalanceAmount(balanceWei: string): {
  rebalanceWei: string;
  rebalanceSats: number;
} {
  // TESTING: Fixed 10 sats (~$0.007 USD)
  const TESTING_SATS = 10;
  const rebalanceSats = TESTING_SATS;

  // Convert sats to wBTC wei
  // 1 sat = 10^10 wei (since wBTC has 8 decimals, need to scale to 18)
  const rebalanceWei = BigInt(rebalanceSats) * BigInt(10 ** 10);

  // PRODUCTION (commented out):
  // const balance = BigInt(balanceWei);
  // const rebalanceWei = (balance * BigInt(20)) / BigInt(100); // 20%
  // const rebalanceSats = wbtcToSats(rebalanceWei.toString());

  return {
    rebalanceWei: rebalanceWei.toString(),
    rebalanceSats,
  };
}

/**
 * Get current timelock timestamp
 */
export function getTimelock(
  durationSeconds: number = LIGHTNING_CONFIG.DEFAULT_TIMELOCK_SECONDS
): number {
  return Math.floor(Date.now() / 1000) + durationSeconds;
}

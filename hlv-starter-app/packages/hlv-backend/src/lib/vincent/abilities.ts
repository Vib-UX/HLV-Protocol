/**
 * Vincent Abilities for HLV Protocol
 *
 * This module manages the Vincent abilities used for rebalancing:
 * 1. Lightning Invoice Creation - Creates LN invoices via NWC
 * 2. Hedera HTLC Creation - Locks wBTC in HTLCs on Hedera
 * 3. Lightning Payment - Pays invoices and captures preimages
 */

import { getVincentAbilityClient } from "@lit-protocol/vincent-app-sdk/abilityClient";
import { asBundledVincentAbility } from "@lit-protocol/vincent-ability-sdk";
import { vincentAbility as lightningInvoiceVincentAbility } from "@hlvuser/ability-lightning-invoice/dist/src/lib/vincent-ability.js";
import { vincentAbility as hederaHTLCVincentAbility } from "@hlvuser/ability-hedera-htlc/dist/src/lib/vincent-ability.js";
import { bundledVincentAbility as lightningPaymentAbility } from "@hlvuser/ability-lightning-payment";
import { ethers } from "ethers";
import { env } from "../env";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { VINCENT_DELEGATEE_PRIVATE_KEY } = env;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Lit Action code directly from .cjs files (bundled code)
const lightningInvoiceLitActionCode = readFileSync(
  join(
    __dirname,
    "../../../node_modules/@hlvuser/ability-lightning-invoice/dist/src/generated/lit-action.cjs"
  ),
  "utf-8"
);

const hederaHTLCLitActionCode = readFileSync(
  join(
    __dirname,
    "../../../node_modules/@hlvuser/ability-hedera-htlc/dist/src/generated/lit-action.cjs"
  ),
  "utf-8"
);

// Create bundled abilities with code instead of IPFS CID
const lightningInvoiceAbility = asBundledVincentAbility(
  lightningInvoiceVincentAbility,
  lightningInvoiceLitActionCode
);

const hederaHTLCAbility = asBundledVincentAbility(
  hederaHTLCVincentAbility,
  hederaHTLCLitActionCode
);

/**
 * IPFS CIDs for deployed abilities (reference only)
 */
export const ABILITY_IPFS_CIDS = {
  LIGHTNING_INVOICE: "QmXi57MFu5XAd5yuZxddxLzsvvfP5a9gRGaFTStUzTRvCd",
  HEDERA_HTLC: "QmV1jzUj3XnwNSr3yAwZX4iEvmfpbzuWgzdKQmx9Uueiq2",
  LIGHTNING_PAYMENT: "QmbG8AeMDqz1tpyR9xWzKqxMgaMX59niee2DR1BCSi666K",
} as const;

/**
 * npm packages for abilities
 */
export const ABILITY_NPM_PACKAGES = {
  LIGHTNING_INVOICE: "@hlvuser/ability-lightning-invoice@1.0.0",
  HEDERA_HTLC: "@hlvuser/ability-hedera-htlc@1.0.0",
  LIGHTNING_PAYMENT: "@hlvuser/ability-lightning-payment@0.1.0",
} as const;

/**
 * Create Ethers signer from delegatee private key
 */
export function getEthersSigner() {
  return new ethers.Wallet(VINCENT_DELEGATEE_PRIVATE_KEY);
}

/**
 * Lightning Invoice Creation Client
 * Now using the published npm package!
 */
export function getLightningInvoiceClient() {
  const client = getVincentAbilityClient({
    bundledVincentAbility: lightningInvoiceAbility,
    ethersSigner: getEthersSigner(),
  });

  console.log(
    "[Abilities] Lightning Invoice ability loaded from npm package",
    ABILITY_NPM_PACKAGES.LIGHTNING_INVOICE
  );

  return client;
}

/**
 * Hedera HTLC Creation Client
 * Now using the published npm package!
 */
export function getHederaHTLCClient() {
  const client = getVincentAbilityClient({
    bundledVincentAbility: hederaHTLCAbility,
    ethersSigner: getEthersSigner(),
  });

  console.log(
    "[Abilities] Hedera HTLC ability loaded from npm package",
    ABILITY_NPM_PACKAGES.HEDERA_HTLC
  );

  return client;
}

/**
 * Lightning Payment Client
 * Uses the published npm package
 */
export function getLightningPaymentClient() {
  const client = getVincentAbilityClient({
    bundledVincentAbility: lightningPaymentAbility,
    ethersSigner: getEthersSigner(),
  });

  console.log(
    "[Abilities] Lightning Payment ability loaded from npm package",
    ABILITY_NPM_PACKAGES.LIGHTNING_PAYMENT
  );

  return client;
}

/**
 * Create Lightning Invoice via NWC
 */
export async function createLightningInvoice(params: {
  amountSat: number;
  description?: string;
  expirySec?: number;
  nwcUri: string;
  delegatorAddress: string;
}) {
  const client = getLightningInvoiceClient();

  console.log("\n🔵 [Lightning Invoice Ability] ========== START ==========");
  console.log("[Lightning Invoice Ability] INPUT:", {
    amountSat: params.amountSat,
    description: params.description,
    expirySec: params.expirySec || 86400,
    delegatorAddress: params.delegatorAddress,
    nwcUri: params.nwcUri.substring(0, 50) + "...",
  });

  const precheckResult = await client.precheck(
    {
      amountSat: params.amountSat,
      description: params.description,
      expirySec: params.expirySec || 86400,
      nwcUri: params.nwcUri,
    },
    {
      delegatorPkpEthAddress: params.delegatorAddress,
    }
  );

  console.log(
    "[Lightning Invoice Ability] PRECHECK:",
    precheckResult.success ? "✅ PASS" : "❌ FAIL"
  );
  if (!precheckResult.success) {
    console.error(
      "[Lightning Invoice Ability] PRECHECK ERROR:",
      JSON.stringify(precheckResult, null, 2)
    );
    throw new Error(
      `Lightning invoice precheck failed: ${JSON.stringify(precheckResult)}`
    );
  }

  const executeResult = await client.execute(
    {
      amountSat: params.amountSat,
      description: params.description,
      expirySec: params.expirySec || 86400,
      nwcUri: params.nwcUri,
    },
    {
      delegatorPkpEthAddress: params.delegatorAddress,
    }
  );

  console.log(
    "[Lightning Invoice Ability] EXECUTE:",
    executeResult.success ? "✅ SUCCESS" : "❌ FAIL"
  );
  if (executeResult.success) {
    console.log("[Lightning Invoice Ability] OUTPUT:", {
      paymentHash: executeResult.result.paymentHash,
      amountSat: executeResult.result.amountSat,
      paymentRequest:
        executeResult.result.paymentRequest?.substring(0, 50) + "...",
      expiresAt: executeResult.result.expiresAt,
    });
  } else {
    console.error(
      "[Lightning Invoice Ability] EXECUTE ERROR:",
      JSON.stringify(executeResult, null, 2)
    );
  }
  console.log("🔵 [Lightning Invoice Ability] ========== END ==========\n");

  if (!executeResult.success) {
    throw new Error(
      `Lightning invoice creation failed: ${JSON.stringify(executeResult)}`
    );
  }

  return executeResult.result;
}

/**
 * Create HTLC on Hedera
 */
export async function createHederaHTLC(params: {
  paymentHash: string;
  amount: string;
  tokenAddress: string;
  htlcContractAddress: string;
  timelock: number;
  rpcUrl: string;
  chainId: number;
  delegatorAddress: string;
}) {
  const client = getHederaHTLCClient();

  console.log("\n🟣 [Hedera HTLC Ability] ========== START ==========");
  console.log("[Hedera HTLC Ability] INPUT:", {
    paymentHash: params.paymentHash,
    amount: params.amount,
    tokenAddress: params.tokenAddress,
    htlcContractAddress: params.htlcContractAddress,
    timelock: params.timelock,
    timelockDate: new Date(params.timelock * 1000).toISOString(),
    rpcUrl: params.rpcUrl,
    chainId: params.chainId,
    delegatorAddress: params.delegatorAddress,
  });

  const precheckResult = await client.precheck(
    {
      paymentHash: params.paymentHash,
      amount: params.amount,
      tokenAddress: params.tokenAddress,
      htlcContractAddress: params.htlcContractAddress,
      timelock: params.timelock,
      rpcUrl: params.rpcUrl,
      chainId: params.chainId,
    },
    {
      delegatorPkpEthAddress: params.delegatorAddress,
    }
  );

  console.log(
    "[Hedera HTLC Ability] PRECHECK:",
    precheckResult.success ? "✅ PASS" : "❌ FAIL"
  );
  if (!precheckResult.success) {
    console.error(
      "[Hedera HTLC Ability] PRECHECK ERROR:",
      JSON.stringify(precheckResult, null, 2)
    );
    throw new Error(
      `Hedera HTLC precheck failed: ${JSON.stringify(precheckResult)}`
    );
  }

  const executeResult = await client.execute(
    {
      paymentHash: params.paymentHash,
      amount: params.amount,
      tokenAddress: params.tokenAddress,
      htlcContractAddress: params.htlcContractAddress,
      timelock: params.timelock,
      rpcUrl: params.rpcUrl,
      chainId: params.chainId,
    },
    {
      delegatorPkpEthAddress: params.delegatorAddress,
    }
  );

  console.log(
    "[Hedera HTLC Ability] EXECUTE:",
    executeResult.success ? "✅ SUCCESS" : "❌ FAIL"
  );
  if (executeResult.success) {
    console.log("[Hedera HTLC Ability] OUTPUT:", {
      contractId: executeResult.result.contractId,
      txHash: executeResult.result.txHash,
      paymentHash: executeResult.result.paymentHash,
      amount: executeResult.result.amount,
      timelock: executeResult.result.timelock,
      blockNumber: executeResult.result.blockNumber,
    });
  } else {
    console.error(
      "[Hedera HTLC Ability] EXECUTE ERROR:",
      JSON.stringify(executeResult, null, 2)
    );
  }
  console.log("🟣 [Hedera HTLC Ability] ========== END ==========\n");

  if (!executeResult.success) {
    throw new Error(
      `Hedera HTLC creation failed: ${JSON.stringify(executeResult)}`
    );
  }

  return executeResult.result;
}

/**
 * Pay Lightning Invoice and capture preimage
 */
export async function payLightningInvoice(params: {
  paymentRequest: string;
  expectedAmountSat?: number;
  nwcUri: string;
  delegatorAddress: string;
}) {
  const client = getLightningPaymentClient();

  const precheckResult = await client.precheck(
    {
      paymentRequest: params.paymentRequest,
      expectedAmountSat: params.expectedAmountSat,
      nwcUri: params.nwcUri,
    },
    {
      delegatorPkpEthAddress: params.delegatorAddress,
    }
  );

  if (!precheckResult.success) {
    throw new Error(
      `Lightning payment precheck failed: ${JSON.stringify(precheckResult)}`
    );
  }

  const executeResult = await client.execute(
    {
      paymentRequest: params.paymentRequest,
      expectedAmountSat: params.expectedAmountSat,
      nwcUri: params.nwcUri,
    },
    {
      delegatorPkpEthAddress: params.delegatorAddress,
    }
  );

  if (!executeResult.success) {
    throw new Error(
      `Lightning payment failed: ${JSON.stringify(executeResult)}`
    );
  }

  return executeResult.result;
}

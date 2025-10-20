import { Job } from "@whisthub/agenda";
import { agenda } from "../agendaClient";
import { jobLogger } from "../../logger";
import { Swap, SwapDirection, SwapStatus } from "../../mongo/models/Swap";
import {
  createLightningInvoice,
  createHederaHTLC,
} from "../../vincent/abilities";
import {
  getHederaNetwork,
  HLV_CONTRACTS,
  calculateRebalanceAmount,
  getTimelock,
  LIGHTNING_CONFIG,
} from "../../hedera-config";
import { env } from "../../env";

export const JOB_NAME = "execute-rebalance";

interface RebalanceJobData {
  userAddress: string;
  wbtcBalanceWei: string;
  nwcUri: string;
  network: "testnet" | "mainnet";
}

export type JobType = Job<RebalanceJobData>;

/**
 * Rebalance Job - Execute the HLV Protocol rebalance flow
 *
 * Flow:
 * 1. Calculate 20% of user's wBTC balance
 * 2. Create Lightning invoice for equivalent sats
 * 3. Create HTLC on Hedera with payment hash
 * 4. Save swap to database for monitoring
 */
export async function executeRebalance(job: Job<RebalanceJobData>) {
  const { userAddress, wbtcBalanceWei, nwcUri, network } = job.attrs.data;

  jobLogger.info(`[Rebalance] Starting rebalance for user ${userAddress}`);
  jobLogger.info(`[Rebalance] wBTC balance: ${wbtcBalanceWei} wei`);

  try {
    // Step 1: Calculate rebalance amount (20% of balance)
    const { rebalanceWei, rebalanceSats } =
      calculateRebalanceAmount(wbtcBalanceWei);

    jobLogger.info(
      `[Rebalance] Rebalance amount: ${rebalanceWei} wei (${rebalanceSats} sats)`
    );

    // Step 2: Create Lightning invoice
    jobLogger.info(`[Rebalance] Creating Lightning invoice...`);

    const invoiceResult = await createLightningInvoice({
      amountSat: rebalanceSats,
      description: `HLV Protocol Rebalance: ${rebalanceSats} sats`,
      expirySec: LIGHTNING_CONFIG.DEFAULT_INVOICE_EXPIRY_SECONDS,
      nwcUri,
      delegatorAddress: userAddress,
    });

    jobLogger.success(`[Rebalance] Lightning invoice created`);
    jobLogger.info(`[Rebalance] Payment hash: ${invoiceResult.paymentHash}`);
    jobLogger.info(`[Rebalance] Invoice: ${invoiceResult.paymentRequest}`);

    // Step 3: Create HTLC on Hedera
    jobLogger.info(`[Rebalance] Creating HTLC on Hedera...`);

    const hederaConfig = getHederaNetwork(network);
    const contracts =
      HLV_CONTRACTS[network.toUpperCase() as keyof typeof HLV_CONTRACTS];
    const timelock = getTimelock();

    const htlcResult = await createHederaHTLC({
      paymentHash: invoiceResult.paymentHash,
      amount: rebalanceWei,
      tokenAddress: contracts.WBTC,
      htlcContractAddress: contracts.HTLC,
      timelock,
      rpcUrl: hederaConfig.rpcUrl,
      chainId: hederaConfig.chainId,
      delegatorAddress: userAddress,
    });

    jobLogger.success(`[Rebalance] HTLC created on Hedera`);
    jobLogger.info(`[Rebalance] Contract ID: ${htlcResult.contractId}`);
    jobLogger.info(`[Rebalance] Tx hash: ${htlcResult.txHash}`);

    // Step 4: Save swap to database
    const swap = new Swap({
      swapId: `rebalance_${Date.now()}_${userAddress.slice(-8)}`,
      direction: SwapDirection.HEDERA_TO_LIGHTNING,
      status: SwapStatus.HTLC_LOCKED,

      paymentHash: invoiceResult.paymentHash,
      htlcAmount: rebalanceWei,
      htlcAddress: contracts.HTLC,
      htlcTxHash: htlcResult.txHash,
      timelock: new Date(timelock * 1000),

      lightningInvoice: invoiceResult.paymentRequest,
      lightningAmount: rebalanceSats,

      userAddress,
      agentAddress: env.VINCENT_DELEGATEE_PRIVATE_KEY, // Agent's address
    });

    await swap.save();

    jobLogger.success(`[Rebalance] Rebalance completed successfully`);
    jobLogger.info(`[Rebalance] Swap ID: ${swap.swapId}`);

    // The HTLC monitor job will detect the payment and claim funds
    return {
      success: true,
      swapId: swap.swapId,
      invoiceRequest: invoiceResult.paymentRequest,
      htlcContractId: htlcResult.contractId,
    };
  } catch (error) {
    jobLogger.error(`[Rebalance] Error executing rebalance:`, error);
    throw error;
  }
}

// NOTE: Job definition moved to jobWorker.ts to match DCA pattern
// This avoids "definition.fn is not a function" error

/**
 * Trigger a rebalance for a user
 */
export async function triggerRebalance(data: RebalanceJobData) {
  await agenda.now(JOB_NAME, data);
  jobLogger.info(`Rebalance job triggered for user ${data.userAddress}`);
}

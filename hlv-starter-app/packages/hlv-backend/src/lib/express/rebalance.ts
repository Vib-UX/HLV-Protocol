import { Application, Request, Response } from "express";
import { z } from "zod";
import { apiLogger, jobLogger } from "../logger";
import { createLightningInvoice, createHederaHTLC } from "../vincent/abilities";
import {
  calculateRebalanceAmount,
  getHederaNetwork,
  HLV_CONTRACTS,
  getTimelock,
} from "../hedera-config";
import { Swap, SwapDirection, SwapStatus } from "../mongo/models/Swap";
import { env } from "../env";

const rebalanceRequestSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  wbtcBalanceWei: z.string(),
  nwcUri: z.string().startsWith("nostr+walletconnect://"),
  network: z.enum(["testnet", "mainnet"]).default("testnet"),
});

export function registerRebalanceRoutes(app: Application): void {
  /**
   * POST /api/rebalance
   * Execute rebalance directly (no Agenda job)
   */
  app.post("/api/rebalance", async (req: Request, res: Response) => {
    try {
      const data = rebalanceRequestSchema.parse(req.body);

      apiLogger.info(`Rebalance requested for user: ${data.userAddress}`);
      apiLogger.info(`Balance: ${data.wbtcBalanceWei} wei`);

      // Execute rebalance directly
      jobLogger.info(
        `[Rebalance] Starting rebalance for user ${data.userAddress}`
      );
      jobLogger.info(`[Rebalance] wBTC balance: ${data.wbtcBalanceWei} wei`);

      // Step 1: Calculate rebalance amount
      const { rebalanceWei, rebalanceSats } = calculateRebalanceAmount(
        data.wbtcBalanceWei
      );

      jobLogger.info(
        `[Rebalance] Rebalance amount: ${rebalanceWei} wei (${rebalanceSats} sats)`
      );

      // Step 2: Create Lightning invoice
      jobLogger.info(`[Rebalance] Creating Lightning invoice...`);

      const invoiceResult = await createLightningInvoice({
        amountSat: rebalanceSats,
        description: `HLV Protocol Rebalance: ${rebalanceSats} sats`,
        nwcUri: data.nwcUri,
        delegatorAddress: data.userAddress,
      });

      jobLogger.success(`[Rebalance] Lightning invoice created ✅`);
      jobLogger.info(`[Rebalance] Payment hash: ${invoiceResult.paymentHash}`);

      // Step 3: Create HTLC on Hedera
      jobLogger.info(`[Rebalance] Creating HTLC on Hedera...`);

      const hederaConfig = getHederaNetwork(data.network);
      const contracts =
        HLV_CONTRACTS[data.network.toUpperCase() as keyof typeof HLV_CONTRACTS];
      const timelock = getTimelock();

      const htlcResult = await createHederaHTLC({
        paymentHash: invoiceResult.paymentHash,
        amount: rebalanceWei,
        tokenAddress: contracts.WBTC,
        htlcContractAddress: contracts.HTLC,
        timelock,
        rpcUrl: hederaConfig.rpcUrl,
        chainId: hederaConfig.chainId,
        delegatorAddress: data.userAddress,
      });

      jobLogger.success(`[Rebalance] HTLC created on Hedera ✅`);
      jobLogger.info(`[Rebalance] Contract ID: ${htlcResult.contractId}`);
      jobLogger.info(`[Rebalance] Tx hash: ${htlcResult.txHash}`);

      // Step 4: Save to database
      const swap = await Swap.create({
        swapId: `rebalance_${Date.now()}_${data.userAddress.slice(0, 8)}`,
        direction: SwapDirection.HEDERA_TO_LIGHTNING,
        status: SwapStatus.HTLC_LOCKED,

        paymentHash: invoiceResult.paymentHash,
        htlcAmount: rebalanceWei,
        htlcAddress: contracts.HTLC,
        htlcTxHash: htlcResult.txHash,
        timelock: new Date(timelock * 1000),

        lightningInvoice: invoiceResult.paymentRequest,
        lightningAmount: rebalanceSats,

        userAddress: data.userAddress,
        agentAddress: env.VINCENT_DELEGATEE_PRIVATE_KEY,
      });

      jobLogger.success(`[Rebalance] Rebalance completed successfully`);
      jobLogger.info(`[Rebalance] Swap ID: ${swap.swapId}`);

      res.status(200).json({
        message: "Rebalance completed successfully",
        userAddress: data.userAddress,
        status: "completed",
        swap: {
          swapId: swap.swapId,
          paymentHash: invoiceResult.paymentHash,
          htlcContractId: htlcResult.contractId,
          htlcTxHash: htlcResult.txHash,
          lightningInvoice: invoiceResult.paymentRequest,
          amountWei: rebalanceWei,
          amountSats: rebalanceSats,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid request",
          details: error.errors,
        });
      } else {
        apiLogger.error("Error executing rebalance:", error);
        jobLogger.error(`[Rebalance] Error:`, error);
        res.status(500).json({
          error: "Failed to execute rebalance",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  /**
   * GET /api/rebalance/:userAddress
   * Get rebalance history for a user
   */
  app.get(
    "/api/rebalance/:userAddress",
    async (req: Request, res: Response) => {
      try {
        const { userAddress } = req.params;

        // TODO: Query swap history from database
        const rebalances = []; // Placeholder

        res.json({
          userAddress,
          rebalances,
          total: rebalances.length,
        });
      } catch (error) {
        apiLogger.error("Error fetching rebalance history:", error);
        res.status(500).json({
          error: "Failed to fetch rebalance history",
        });
      }
    }
  );
}

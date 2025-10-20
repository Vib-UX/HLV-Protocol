import { Job } from '@whisthub/agenda';
import { agenda } from '../agendaClient';
import { jobLogger, lightningLogger, htlcLogger } from '../../logger';
import { Swap, SwapStatus } from '../../mongo/models/Swap';
import { LightningError, HTLCError } from '../../error';

const JOB_NAME = 'execute-swap';

interface ExecuteSwapData {
  swapId: string;
}

/**
 * Executes a swap by paying the Lightning invoice and submitting preimage to HTLC
 */
async function executeSwap(job: Job<ExecuteSwapData>) {
  const { swapId } = job.attrs.data;
  lightningLogger.info(`Executing swap: ${swapId}`);

  try {
    const swap = await Swap.findOne({ swapId });
    if (!swap) {
      throw new Error(`Swap not found: ${swapId}`);
    }

    if (swap.status !== SwapStatus.HTLC_LOCKED) {
      lightningLogger.warn(`Swap ${swapId} is not in HTLC_LOCKED state, skipping`);
      return;
    }

    // Step 1: Pay Lightning invoice
    lightningLogger.info(`Paying Lightning invoice for swap ${swapId}`);
    
    // TODO: Implement actual Lightning payment via Vincent ability
    // For now, simulate payment
    const preimage = generateMockPreimage();
    const paymentTxId = `ln_${Date.now()}`;

    swap.preimage = preimage;
    swap.lightningPaymentTxId = paymentTxId;
    swap.status = SwapStatus.LIGHTNING_PAID;
    await swap.save();

    lightningLogger.success(`Lightning invoice paid for swap ${swapId}`);

    // Step 2: Submit preimage to HTLC contract
    htlcLogger.info(`Submitting preimage to HTLC for swap ${swapId}`);
    
    // TODO: Implement actual HTLC claim via Hedera transaction
    // For now, simulate submission
    const htlcTxHash = `hedera_${Date.now()}`;

    swap.htlcTxHash = htlcTxHash;
    swap.status = SwapStatus.PREIMAGE_SUBMITTED;
    await swap.save();

    htlcLogger.success(`Preimage submitted to HTLC for swap ${swapId}`);

    // Step 3: Wait for confirmation and mark complete
    swap.status = SwapStatus.COMPLETED;
    swap.completedAt = new Date();
    await swap.save();

    lightningLogger.success(`Swap ${swapId} completed successfully`);
  } catch (error) {
    lightningLogger.error(`Error executing swap ${swapId}:`, error);
    
    // Update swap status to failed
    try {
      const swap = await Swap.findOne({ swapId });
      if (swap) {
        swap.status = SwapStatus.FAILED;
        swap.error = error instanceof Error ? error.message : 'Unknown error';
        await swap.save();
      }
    } catch (updateError) {
      lightningLogger.error(`Failed to update swap status:`, updateError);
    }

    throw error;
  }
}

function generateMockPreimage(): string {
  // Generate a random 32-byte preimage (64 hex characters)
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function defineExecuteSwapJob() {
  agenda.define(JOB_NAME, { priority: 'high', concurrency: 5 }, executeSwap);
  
  jobLogger.info(`Job defined: ${JOB_NAME}`);
}


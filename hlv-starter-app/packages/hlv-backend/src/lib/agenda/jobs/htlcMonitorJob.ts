import { Job } from '@whisthub/agenda';
import { agenda } from '../agendaClient';
import { jobLogger, htlcLogger } from '../../logger';
import { Swap, SwapStatus } from '../../mongo/models/Swap';

const JOB_NAME = 'monitor-htlc-locks';

/**
 * Monitors the Hedera HTLC contract for new locks and pending swaps
 */
async function monitorHTLCLocks(job: Job) {
  htlcLogger.info('Checking for new HTLC locks...');

  try {
    // TODO: Query Hedera HTLC contract for new lock events
    // For now, we'll just check pending swaps in the database
    
    const pendingSwaps = await Swap.find({
      status: SwapStatus.PENDING,
    }).limit(10);

    htlcLogger.info(`Found ${pendingSwaps.length} pending swaps`);

    for (const swap of pendingSwaps) {
      // Check if HTLC has been locked on-chain
      // TODO: Implement actual on-chain verification
      
      // For demo purposes, assume HTLC is locked after 1 minute
      const elapsedMs = Date.now() - swap.createdAt.getTime();
      if (elapsedMs > 60000) {
        swap.status = SwapStatus.HTLC_LOCKED;
        await swap.save();
        
        // Schedule execution job
        await agenda.now('execute-swap', { swapId: swap.swapId });
        htlcLogger.info(`HTLC locked for swap ${swap.swapId}, scheduled execution`);
      }
    }

    htlcLogger.success('HTLC monitoring completed');
  } catch (error) {
    htlcLogger.error('Error monitoring HTLC locks:', error);
    throw error;
  }
}

export function defineHTLCMonitorJob() {
  agenda.define(JOB_NAME, { priority: 'high', concurrency: 1 }, monitorHTLCLocks);
  
  jobLogger.info(`Job defined: ${JOB_NAME}`);
}

export async function scheduleHTLCMonitorJob() {
  await agenda.every('30 seconds', JOB_NAME);
  jobLogger.info(`Job scheduled: ${JOB_NAME} (every 30 seconds)`);
}


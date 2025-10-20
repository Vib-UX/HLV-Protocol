import { defineHTLCMonitorJob, scheduleHTLCMonitorJob } from './htlcMonitorJob';
import { defineExecuteSwapJob } from './executeSwapJob';
import { defineRebalanceJob } from './rebalanceJob';
import { jobLogger } from '../../logger';

export async function defineAllJobs() {
  jobLogger.info('Defining all jobs...');
  
  defineHTLCMonitorJob();
  defineExecuteSwapJob();
  defineRebalanceJob();
  
  jobLogger.success('All jobs defined');
}

export async function scheduleAllJobs() {
  jobLogger.info('Scheduling all jobs...');
  
  await scheduleHTLCMonitorJob();
  
  jobLogger.success('All jobs scheduled');
}


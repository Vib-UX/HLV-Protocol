#!/usr/bin/env node

/**
 * Combined server + worker for development and single-instance deployments
 */

import { startApiServer } from '../lib/apiServer';
import { startJobWorker } from '../lib/jobWorker';
import { serviceLogger } from '../lib/logger';

async function startServerWorker() {
  serviceLogger.info('Starting combined server + worker...');
  
  try {
    // Start both API server and job worker
    await Promise.all([
      startApiServer(),
      startJobWorker(),
    ]);
    
    serviceLogger.success('Server + Worker started successfully');
  } catch (error) {
    serviceLogger.error('Failed to start server + worker:', error);
    process.exit(1);
  }
}

startServerWorker();


#!/usr/bin/env node

import { startJobWorker } from '../lib/jobWorker';
import { serviceLogger } from '../lib/logger';

startJobWorker().catch((error) => {
  serviceLogger.error('Failed to start job worker:', error);
  process.exit(1);
});


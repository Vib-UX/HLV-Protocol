#!/usr/bin/env node

import { startApiServer } from '../lib/apiServer';
import { serviceLogger } from '../lib/logger';

startApiServer().catch((error) => {
  serviceLogger.error('Failed to start API server:', error);
  process.exit(1);
});


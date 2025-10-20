import { Application, Request, Response } from 'express';
import { apiLogger } from '../logger';

export function registerAgentRoutes(app: Application): void {
  // Get agent status
  app.get('/api/agent/status', async (_req: Request, res: Response) => {
    try {
      // TODO: Implement actual agent status checking
      const status = {
        online: true,
        lightningCapacity: {
          local: 1000000, // sats
          remote: 500000,
          total: 1500000,
        },
        hederaBalance: {
          hbar: '100.0',
          wbtc: '0.5',
        },
        activeSwaps: 0,
        completedSwaps: 0,
        uptime: process.uptime(),
      };

      res.json({ status });
    } catch (error) {
      apiLogger.error('Error getting agent status:', error);
      res.status(500).json({ error: 'Failed to get agent status' });
    }
  });

  // Get agent balances
  app.get('/api/agent/balance', async (_req: Request, res: Response) => {
    try {
      // TODO: Query actual Lightning node and Hedera balances
      const balances = {
        lightning: {
          local: 1000000, // sats
          remote: 500000,
          pending: 0,
        },
        hedera: {
          hbar: '100.0',
          wbtc: '0.5',
        },
        lastUpdated: new Date().toISOString(),
      };

      res.json({ balances });
    } catch (error) {
      apiLogger.error('Error getting agent balance:', error);
      res.status(500).json({ error: 'Failed to get agent balance' });
    }
  });
}


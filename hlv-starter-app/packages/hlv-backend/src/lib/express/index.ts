import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import { env } from '../env';
import { apiLogger } from '../logger';
import { registerSwapRoutes } from './swaps';
import { registerAgentRoutes } from './agent';
import { registerRebalanceRoutes } from './rebalance';

export function registerRoutes(app: Application): void {
  // Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ALLOWED_DOMAIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    apiLogger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  registerSwapRoutes(app);
  registerAgentRoutes(app);
  registerRebalanceRoutes(app);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: Function) => {
    apiLogger.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });
}


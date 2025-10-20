import { Application, Request, Response } from 'express';
import { z } from 'zod';

import { apiLogger } from '../logger';
import { NotFoundError, ValidationError } from '../error';
import { Swap, SwapDirection, SwapStatus } from '../mongo/models/Swap';

const createSwapSchema = z.object({
  direction: z.nativeEnum(SwapDirection),
  lightningInvoice: z.string().min(1),
  htlcAmount: z.string(),
  userAddress: z.string(),
  timelock: z.number(),
});

export function registerSwapRoutes(app: Application): void {
  // List all swaps
  app.get('/api/swaps', async (req: Request, res: Response) => {
    try {
      const { userAddress, status } = req.query;
      const filter: any = {};
      
      if (userAddress) filter.userAddress = userAddress;
      if (status) filter.status = status;

      const swaps = await Swap.find(filter).sort({ createdAt: -1 }).limit(100);
      res.json({ swaps });
    } catch (error) {
      apiLogger.error('Error listing swaps:', error);
      res.status(500).json({ error: 'Failed to list swaps' });
    }
  });

  // Get swap by ID
  app.get('/api/swaps/:id', async (req: Request, res: Response) => {
    try {
      const swap = await Swap.findOne({ swapId: req.params.id });
      if (!swap) {
        throw new NotFoundError('Swap');
      }
      res.json({ swap });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        apiLogger.error('Error getting swap:', error);
        res.status(500).json({ error: 'Failed to get swap' });
      }
    }
  });

  // Create new swap
  app.post('/api/swaps', async (req: Request, res: Response) => {
    try {
      const validatedData = createSwapSchema.parse(req.body);
      
      // TODO: Decode Lightning invoice to extract payment hash and amount
      const paymentHash = '0x' + '0'.repeat(64); // Placeholder
      const lightningAmount = 10000; // Placeholder - should decode from invoice
      
      const swap = new Swap({
        swapId: `swap_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        direction: validatedData.direction,
        status: SwapStatus.PENDING,
        paymentHash,
        htlcAmount: validatedData.htlcAmount,
        htlcAddress: process.env.HTLC_CONTRACT_ADDRESS || '0x0',
        timelock: new Date(validatedData.timelock),
        lightningInvoice: validatedData.lightningInvoice,
        lightningAmount,
        userAddress: validatedData.userAddress,
        agentAddress: process.env.AGENT_ADDRESS || '0x0',
      });

      await swap.save();
      apiLogger.info(`Created swap: ${swap.swapId}`);
      
      res.status(201).json({ swap });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        apiLogger.error('Error creating swap:', error);
        res.status(500).json({ error: 'Failed to create swap' });
      }
    }
  });

  // Cancel swap
  app.delete('/api/swaps/:id', async (req: Request, res: Response) => {
    try {
      const swap = await Swap.findOne({ swapId: req.params.id });
      if (!swap) {
        throw new NotFoundError('Swap');
      }

      if (swap.status !== SwapStatus.PENDING) {
        throw new ValidationError('Can only cancel pending swaps');
      }

      swap.status = SwapStatus.CANCELLED;
      await swap.save();

      apiLogger.info(`Cancelled swap: ${swap.swapId}`);
      res.json({ swap });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        apiLogger.error('Error cancelling swap:', error);
        res.status(500).json({ error: 'Failed to cancel swap' });
      }
    }
  });
}


/**
 * Health check endpoint
 *
 * Used by load balancers and monitoring systems to verify the service is running.
 * Returns quickly with basic health information.
 */

import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

healthRouter.get('/ready', (req: Request, res: Response) => {
  // TODO: Check database and Redis connectivity before returning 200
  // For now, assume ready on startup
  res.status(200).json({ status: 'ready' });
});

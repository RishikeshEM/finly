/**
 * Accounts routes (read-only)
 *
 * Each user has exactly one manual-entry account, created at registration
 * (see auth.service.ts). This endpoint lets the frontend look up that
 * account's id to attach to new transactions.
 */

import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export const accountsRouter = Router();
accountsRouter.use(authMiddleware);

accountsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, type, created_at FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user!.userId]
    );
    res.status(200).json({ accounts: result.rows });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

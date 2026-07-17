/**
 * Transactions CRUD routes (MVP Implementation)
 * GET/POST/PATCH/DELETE /api/v1/transactions
 * Amounts as integer cents, never floating point
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
} from '../services/transactions.service';

export const transactionsRouter = Router();
transactionsRouter.use(authMiddleware);

// Transactions

transactionsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await getTransactions(userId, limit, offset);
    res.status(200).json({ transactions, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

transactionsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { accountId, categoryId, type, amountCents, date, notes, paymentMethod, idempotencyKey, recurring, recurrenceRule } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey required for duplicate protection' });
    }

    const transaction = await createTransaction(userId, accountId, categoryId, type, amountCents, date, idempotencyKey, notes, paymentMethod, recurring, recurrenceRule);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

transactionsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const transaction = await updateTransaction(userId, id, req.body);
    res.status(200).json(transaction);
  } catch (error) {
    res.status(error instanceof Error && error.message === 'Transaction not found' ? 404 : 400).json({ error: (error as Error).message });
  }
});

transactionsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    await deleteTransaction(userId, id);
    res.status(204).send();
  } catch (error) {
    res.status(error instanceof Error && error.message === 'Transaction not found' ? 404 : 400).json({ error: (error as Error).message });
  }
});

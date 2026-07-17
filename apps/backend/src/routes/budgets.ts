/**
 * Budgets CRUD routes (MVP)
 * Period-based budgets with optimistic concurrency control (BE-EC-02)
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { createBudget, getBudgets, getBudgetStatus, updateBudget, deleteBudget } from '../services/budgets.service';

export const budgetsRouter = Router();
budgetsRouter.use(authMiddleware);

budgetsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const budgets = await getBudgets(req.user!.userId);
    const status = await getBudgetStatus(req.user!.userId);
    res.json({ budgets, status });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

budgetsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, periodType, limitCents, startDate } = req.body;
    const budget = await createBudget(req.user!.userId, categoryId, periodType, limitCents, startDate);
    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

budgetsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { limitCents, version } = req.body;

    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'version is required to detect concurrent updates' });
    }

    const budget = await updateBudget(req.user!.userId, req.params.id, limitCents, version);
    res.json(budget);
  } catch (error) {
    const msg = (error as Error).message;
    res.status(msg.includes('not found') ? 404 : msg.includes('modified') ? 409 : 400).json({ error: msg });
  }
});

budgetsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await deleteBudget(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    const msg = (error as Error).message;
    res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
  }
});

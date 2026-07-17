/**
 * Savings Goals CRUD routes (MVP)
 * Progress percentage can exceed 100% (goal exceeded), not clipped or errored.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { createGoal, getGoals, updateGoal, deleteGoal } from '../services/goals.service';

export const goalsRouter = Router();
goalsRouter.use(authMiddleware);

goalsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const goals = await getGoals(req.user!.userId);
    res.json({ goals });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

goalsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, targetCents, deadline, monthlyContributionCents } = req.body;
    const goal = await createGoal(req.user!.userId, name, targetCents, deadline, monthlyContributionCents);
    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

goalsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { version, ...updates } = req.body;

    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'version is required to detect concurrent updates' });
    }

    const goal = await updateGoal(req.user!.userId, req.params.id, updates, version);
    res.json(goal);
  } catch (error) {
    const msg = (error as Error).message;
    res.status(msg.includes('not found') ? 404 : msg.includes('modified') ? 409 : 400).json({ error: msg });
  }
});

goalsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await deleteGoal(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    const msg = (error as Error).message;
    res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
  }
});

/**
 * Categories CRUD routes
 *
 * Endpoints:
 * - GET /api/v1/categories
 * - POST /api/v1/categories
 * - PATCH /api/v1/categories/:id
 * - DELETE /api/v1/categories/:id (blocks deletion if referenced, per BE-EC-07)
 *
 * Categories are seeded with system defaults (Food, Transportation, etc.)
 * per database-spec §2.2. Users can create custom categories.
 *
 * BE-EC-07 policy decision: DELETE blocks (409) if the category is referenced by
 * existing transactions/budgets, rather than silently reassigning. This is the safe
 * default pending a product decision on reassign-vs-block (backend-spec §6); callers
 * are expected to reassign transactions/budgets to a different category first.
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { createCategory, getCategories, updateCategory, deleteCategory } from '../services/transactions.service';

export const categoriesRouter = Router();
categoriesRouter.use(authMiddleware);

/**
 * GET /api/v1/categories
 * List all categories (system defaults + user custom)
 */
categoriesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await getCategories(req.user!.userId);
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/categories
 * Create a new custom category for the current user
 */
categoriesRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name required' });
    }

    const category = await createCategory(req.user!.userId, name, icon);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /api/v1/categories/:id
 * Update a custom category's name/icon
 */
categoriesRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon } = req.body;
    const category = await updateCategory(req.user!.userId, req.params.id, name, icon);
    res.status(200).json(category);
  } catch (error) {
    res.status((error as Error).message.includes('not found') ? 404 : 400).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/categories/:id
 * Delete a category. Blocks (409) if referenced by transactions/budgets (BE-EC-07).
 */
categoriesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await deleteCategory(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes('not found') ? 404 : message.includes('Cannot delete') ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

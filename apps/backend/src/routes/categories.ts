/**
 * Categories CRUD routes
 *
 * Endpoints:
 * - GET /api/v1/categories
 * - POST /api/v1/categories
 *
 * Note: Categories are seeded with system defaults (Food, Transportation, etc.)
 * per database-spec §2.2. Users can create custom categories.
 * DELETE endpoint is not included in MVP due to the FK policy decision (BE-EC-07)
 * that is still flagged as "decision needed" in backend-spec §6.
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Request, Response } from 'express';

export const categoriesRouter = Router();

/**
 * GET /api/v1/categories
 * List all categories (system defaults + user custom)
 */
categoriesRouter.get('/', async (req: Request, res: Response) => {
  // TODO: Implement categories list
  // - Verify JWT token
  // - Extract user_id from token
  // - Query categories table:
  //   - Include system default categories (user_id IS NULL)
  //   - Include user's custom categories (user_id = current user_id)
  // - Return array of categories with id, name, icon, etc.
  //
  // Latency budget: p50 < ~80ms
  res.status(200).json({
    message: 'List categories endpoint - not yet implemented',
    categories: [],
  });
});

/**
 * POST /api/v1/categories
 * Create a new custom category for the current user
 *
 * Request body:
 * {
 *   name: string,
 *   icon?: string (emoji or icon identifier),
 * }
 */
categoriesRouter.post('/', async (req: Request, res: Response) => {
  // TODO: Implement category creation
  // - Verify JWT token
  // - Extract user_id from token
  // - Validate input:
  //   - name is non-empty, reasonable length
  //   - name is unique for this user (can't duplicate system or other user categories)
  // - Create category record with user_id = current user_id
  // - Audit log: category_created
  // - Return created category with id
  //
  // Latency budget: p50 < ~100ms
  res.status(201).json({
    message: 'Create category endpoint - not yet implemented',
    category: null,
  });
});

/**
 * Note on DELETE /api/v1/categories/:id
 *
 * Delete is intentionally NOT implemented in MVP due to the open question:
 * "What policy when deleting a category referenced by existing transactions/budgets?"
 * Options are:
 * A) Block deletion (FK constraint ON DELETE RESTRICT)
 * B) Reassign to a default category (ON DELETE SET DEFAULT)
 * C) Soft-delete with migration logic
 *
 * This is flagged in backend-spec §6 as "needs a decision before implementing".
 * Once the product decision is made, this handler can be added with the chosen policy.
 * The database migration should provision the FK policy at that time.
 */

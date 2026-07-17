/**
 * Savings Goals CRUD routes
 *
 * Endpoints:
 * - GET /api/v1/goals
 * - POST /api/v1/goals
 * - PATCH /api/v1/goals/:id
 * - DELETE /api/v1/goals/:id
 *
 * Goals track savings targets with a deadline, current progress, and suggested
 * monthly contribution. Progress can exceed 100% (goal exceeded).
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Request, Response } from 'express';

export const goalsRouter = Router();

/**
 * GET /api/v1/goals
 * List all savings goals for the current user
 */
goalsRouter.get('/', async (req: Request, res: Response) => {
  // TODO: Implement goals list
  // - Verify JWT token
  // - Extract user_id from token
  // - Query goals table filtered by user_id
  // - For each goal, compute progress percentage: (current_cents / target_cents) * 100
  // - Include computed progress, days remaining until deadline, etc.
  // - Handle >100% progress correctly (goal exceeded state)
  // - Return array of goals with all details
  //
  // Latency budget: p50 < ~80ms
  res.status(200).json({
    message: 'List goals endpoint - not yet implemented',
    goals: [],
  });
});

/**
 * POST /api/v1/goals
 * Create a new savings goal
 *
 * Request body:
 * {
 *   name: string,
 *   targetCents: integer,
 *   deadline: ISO date string,
 *   monthlyContributionCents?: integer,
 * }
 */
goalsRouter.post('/', async (req: Request, res: Response) => {
  // TODO: Implement goal creation
  // - Verify JWT token
  // - Extract user_id from token
  // - Validate input:
  //   - name is non-empty
  //   - targetCents is positive
  //   - deadline is in the future
  //   - monthlyContributionCents (if provided) is positive
  // - Create goal record with user_id, current_cents initialized to 0
  // - Initialize version/updated_at for optimistic concurrency (BE-EC-02)
  // - Invalidate dashboard cache
  // - Audit log: goal_created
  // - Return created goal with id
  //
  // Latency budget: p50 < ~100ms
  res.status(201).json({
    message: 'Create goal endpoint - not yet implemented',
    goal: null,
  });
});

/**
 * PATCH /api/v1/goals/:id
 * Update a goal (handle concurrent updates with optimistic locking per BE-EC-02)
 *
 * Request body:
 * {
 *   name?: string,
 *   targetCents?: integer,
 *   deadline?: ISO date string,
 *   monthlyContributionCents?: integer,
 *   currentCents?: integer (if user "adds funds" to the goal),
 *   version: integer (from last GET, for optimistic concurrency detection),
 * }
 */
goalsRouter.patch('/:id', async (req: Request, res: Response) => {
  // TODO: Implement goal update
  // - Verify JWT token
  // - Extract user_id and goal_id
  // - Verify goal belongs to current user
  // - Validate input
  // - Check version/updated_at for concurrent-update conflicts (BE-EC-02):
  //   - If version doesn't match latest, return conflict error (409)
  //   - Otherwise, proceed with update
  // - Update goal record, increment version
  // - Invalidate dashboard cache (especially if currentCents changed)
  // - Audit log: goal_updated with diff
  // - Return updated goal with new version and recomputed progress percentage
  const goalId = req.params.id;
  res.status(200).json({
    message: 'Update goal endpoint - not yet implemented',
    goalId,
    goal: null,
  });
});

/**
 * DELETE /api/v1/goals/:id
 * Delete a savings goal
 */
goalsRouter.delete('/:id', async (req: Request, res: Response) => {
  // TODO: Implement goal deletion
  // - Verify JWT token
  // - Extract user_id and goal_id
  // - Verify goal belongs to current user
  // - Delete goal record
  // - Invalidate dashboard cache
  // - Audit log: goal_deleted
  // - Return success confirmation
  const goalId = req.params.id;
  res.status(200).json({
    message: 'Delete goal endpoint - not yet implemented',
    goalId,
    success: false,
  });
});

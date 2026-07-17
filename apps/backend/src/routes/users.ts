/**
 * User profile routes
 *
 * Endpoints:
 * - GET /api/v1/users/me
 * - PATCH /api/v1/users/me
 * - GET /api/v1/users/me/export (GDPR data export)
 * - DELETE /api/v1/users/me (account deletion, GDPR right-to-erasure)
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Request, Response } from 'express';

export const usersRouter = Router();

/**
 * GET /api/v1/users/me
 * Get current user's profile
 */
usersRouter.get('/me', async (req: Request, res: Response) => {
  // TODO: Implement profile retrieval
  // - Verify JWT token is valid
  // - Extract user_id from token claims
  // - Query users table for current user_id
  // - Return user profile: email, preferred_currency, country, timezone, notification_prefs, role
  // - Never return password_hash
  res.status(200).json({
    message: 'Get user profile endpoint - not yet implemented',
    user: null,
  });
});

/**
 * PATCH /api/v1/users/me
 * Update current user's profile
 * Allowed fields: preferred_currency, country, timezone, notification_prefs
 */
usersRouter.patch('/me', async (req: Request, res: Response) => {
  // TODO: Implement profile update
  // - Verify JWT token
  // - Extract user_id from token
  // - Validate input (supported currencies, valid timezones, etc.)
  // - Update users table for current user_id
  // - Audit log: profile_updated with diff
  // - Return updated profile
  res.status(200).json({
    message: 'Update user profile endpoint - not yet implemented',
    user: null,
  });
});

/**
 * GET /api/v1/users/me/export
 * GDPR data export - return all user data as JSON
 */
usersRouter.get('/me/export', async (req: Request, res: Response) => {
  // TODO: Implement GDPR data export (BE-EC-10)
  // - Verify JWT token
  // - Query all tables for current user_id:
  //   - users (all fields except password_hash)
  //   - accounts
  //   - transactions
  //   - budgets
  //   - goals
  //   - notifications
  //   - payments
  //   - audit_logs
  // - Return as JSON or trigger async download job
  // - Audit log: data_export_requested
  res.status(200).json({
    message: 'GDPR data export endpoint - not yet implemented',
    data: null,
  });
});

/**
 * DELETE /api/v1/users/me
 * Delete user account (soft-delete PII, retain anonymized audit logs per BE-EC-10)
 */
usersRouter.delete('/me', async (req: Request, res: Response) => {
  // TODO: Implement account deletion
  // - Verify JWT token
  // - Begin transaction
  // - Soft-delete user: set deleted_at timestamp, anonymize PII (email, name, etc.)
  // - Audit log: account_deleted
  // - Commit transaction
  // - Clear any cached data for this user
  // - Return success confirmation
  res.status(200).json({
    message: 'Delete account endpoint - not yet implemented',
    success: false,
  });
});

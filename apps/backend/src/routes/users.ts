/**
 * User profile routes
 *
 * MVP Implementation (Phase 1):
 * - GET /api/v1/users/me (profile retrieval)
 * - PATCH /api/v1/users/me (profile update)
 *
 * Phase 2 (Future):
 * - GET /api/v1/users/me/export (GDPR data export - part of BE-10)
 * - DELETE /api/v1/users/me (account deletion - part of BE-10)
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export const usersRouter = Router();

// Apply auth middleware to all routes
usersRouter.use(authMiddleware);

/**
 * GET /api/v1/users/me
 * Get current user's profile
 */
usersRouter.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      'SELECT id, email, preferred_currency, country, timezone, notification_prefs, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.status(200).json(user);
  } catch (error) {
    const message = (error as Error).message;
    res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/v1/users/me
 * Update current user's profile
 * Allowed fields: preferred_currency, country, timezone, notification_prefs
 */
usersRouter.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { preferred_currency, country, timezone, notification_prefs } = req.body;

    const client = await pool.connect();

    try {
      // Get current user data for audit diff
      const currentResult = await client.query(
        'SELECT preferred_currency, country, timezone, notification_prefs FROM users WHERE id = $1',
        [userId]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUser = currentResult.rows[0];

      // Build update query dynamically (only include provided fields)
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (preferred_currency !== undefined) {
        updates.push(`preferred_currency = $${paramCount}`);
        values.push(preferred_currency);
        paramCount++;
      }

      if (country !== undefined) {
        updates.push(`country = $${paramCount}`);
        values.push(country);
        paramCount++;
      }

      if (timezone !== undefined) {
        updates.push(`timezone = $${paramCount}`);
        values.push(timezone);
        paramCount++;
      }

      if (notification_prefs !== undefined) {
        updates.push(`notification_prefs = $${paramCount}`);
        values.push(JSON.stringify(notification_prefs));
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Add user_id as last parameter
      values.push(userId);

      // Update user
      const updateQuery = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, email, preferred_currency, country, timezone, notification_prefs, role`;

      const updateResult = await client.query(updateQuery, values);
      const updatedUser = updateResult.rows[0];

      // Audit log
      const diff = {
        preferred_currency: { from: currentUser.preferred_currency, to: preferred_currency },
        country: { from: currentUser.country, to: country },
        timezone: { from: currentUser.timezone, to: timezone },
        notification_prefs: { from: currentUser.notification_prefs, to: notification_prefs },
      };

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'update', 'user', userId, JSON.stringify(diff)]
      );

      res.status(200).json(updatedUser);
    } finally {
      client.release();
    }
  } catch (error) {
    const message = (error as Error).message;
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/v1/users/me/export
 * GDPR data export - Phase 2 (part of BE-10)
 */
usersRouter.get('/me/export', async (req: AuthRequest, res: Response) => {
  res.status(501).json({
    error: 'Not yet implemented',
    message: 'Coming in Phase 2: GDPR data export (part of BE-10)',
  });
});

/**
 * DELETE /api/v1/users/me
 * Account deletion - Phase 2 (part of BE-10)
 */
usersRouter.delete('/me', async (req: AuthRequest, res: Response) => {
  res.status(501).json({
    error: 'Not yet implemented',
    message: 'Coming in Phase 2: Account deletion with GDPR compliance (part of BE-10)',
  });
});

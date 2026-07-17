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

import { Router, Response } from 'express';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export const usersRouter = Router();
usersRouter.use(authMiddleware);

/**
 * GET /api/v1/users/me
 * Get current user's profile
 */
usersRouter.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      'SELECT id, email, preferred_currency, country, timezone, notification_prefs, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /api/v1/users/me
 * Update current user's profile
 * Allowed fields: preferred_currency, country, timezone, notification_prefs
 */
usersRouter.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { preferred_currency, country, timezone, notification_prefs } = req.body;

    const client = await pool.connect();

    try {
      const currentResult = await client.query(
        'SELECT preferred_currency, country, timezone, notification_prefs FROM users WHERE id = $1',
        [userId]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUser = currentResult.rows[0];
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

      values.push(userId);

      const updateQuery = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, email, preferred_currency, country, timezone, notification_prefs, role`;

      const updateResult = await client.query(updateQuery, values);
      const updatedUser = updateResult.rows[0];

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
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/users/me/export
 * GDPR data export (BE-EC-10) - return all user data as a JSON snapshot
 */
usersRouter.get('/me/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [user, accounts, transactions, budgets, goals, notifications, payments] = await Promise.all([
      pool.query('SELECT id, email, preferred_currency, country, timezone, notification_prefs, role, created_at FROM users WHERE id = $1', [userId]),
      pool.query('SELECT id, name, type, created_at FROM accounts WHERE user_id = $1', [userId]),
      pool.query(
        `SELECT t.id, t.type, t.amount_cents, t.date, t.notes, t.payment_method, t.recurring
         FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = $1`,
        [userId]
      ),
      pool.query('SELECT id, category_id, period_type, limit_cents, start_date FROM budgets WHERE user_id = $1', [userId]),
      pool.query('SELECT id, name, target_cents, current_cents, deadline FROM goals WHERE user_id = $1', [userId]),
      pool.query('SELECT id, type, channel, payload, sent_at, read_at FROM notifications WHERE user_id = $1', [userId]),
      pool.query('SELECT id, plan_id, status, amount_cents, created_at FROM payments WHERE user_id = $1', [userId]),
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'create', 'gdpr_export', userId, JSON.stringify({ event: 'data_export_requested' })]
    );

    res.status(200).json({
      user: user.rows[0],
      accounts: accounts.rows,
      transactions: transactions.rows,
      budgets: budgets.rows,
      goals: goals.rows,
      notifications: notifications.rows,
      payments: payments.rows,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/users/me
 * Delete user account (BE-EC-10) - soft-delete PII, retain anonymized audit logs.
 * GDPR soft-delete (retain anonymized audit trail) is the chosen approach per
 * backend-spec §6 - anonymizing satisfies both erasure and audit-trail retention.
 */
usersRouter.delete('/me', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const userId = req.user!.userId;

    await client.query('BEGIN');

    const result = await client.query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft-delete: anonymize PII, set deleted_at. audit_logs rows referencing this
    // user_id remain (FK is ON DELETE SET NULL, but we soft-delete here, not hard-delete,
    // so the FK stays intact and existing audit rows keep their user_id reference).
    await client.query(
      `UPDATE users SET email = $1, password_hash = NULL, oauth_provider = NULL, oauth_id = NULL, deleted_at = NOW()
       WHERE id = $2`,
      [`deleted-${userId}@anonymized.finly.app`, userId]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'delete', 'user', userId, JSON.stringify({ event: 'account_deleted' })]
    );

    await client.query('COMMIT');

    res.status(200).json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
});

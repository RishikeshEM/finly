/**
 * Budgets Service
 * Period-based budgets with optimistic concurrency control
 */

import { pool } from '../db';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  period_type: 'monthly' | 'weekly' | 'yearly';
  limit_cents: number;
  start_date: string;
  version: number;
  updated_at: string;
}

export async function createBudget(
  userId: string,
  categoryId: string,
  periodType: 'monthly' | 'weekly' | 'yearly',
  limitCents: number,
  startDate: string
): Promise<Budget> {
  const result = await pool.query(
    `INSERT INTO budgets (user_id, category_id, period_type, limit_cents, start_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, category_id, period_type, limit_cents, start_date, version, updated_at`,
    [userId, categoryId, periodType, limitCents, startDate]
  );

  const budget = result.rows[0];

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'create', 'budget', budget.id, JSON.stringify({ period_type: periodType, limit_cents: limitCents })]
  );

  return budget;
}

export async function getBudgets(userId: string): Promise<Budget[]> {
  const result = await pool.query(
    `SELECT id, user_id, category_id, period_type, limit_cents, start_date, version, updated_at
     FROM budgets WHERE user_id = $1 ORDER BY start_date DESC`,
    [userId]
  );

  return result.rows;
}

export async function getBudgetStatus(userId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT b.id, b.category_id, b.limit_cents,
            COALESCE(SUM(t.amount_cents), 0) as spent_cents,
            CASE
              WHEN COALESCE(SUM(t.amount_cents), 0) >= b.limit_cents THEN 'over_budget'
              WHEN COALESCE(SUM(t.amount_cents), 0) >= (b.limit_cents * 0.85) THEN 'near_limit'
              ELSE 'on_track'
            END as status
     FROM budgets b
     LEFT JOIN transactions t ON b.category_id = t.category_id
       AND DATE_TRUNC(b.period_type, t.date AT TIME ZONE $2) = DATE_TRUNC(b.period_type, b.start_date AT TIME ZONE $2)
     WHERE b.user_id = $1
     GROUP BY b.id, b.category_id, b.limit_cents`,
    [userId, 'UTC']
  );

  return result.rows;
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  limitCents?: number,
  expectedVersion?: number
): Promise<Budget> {
  const client = await pool.connect();

  try {
    const getCurrentResult = await client.query(
      `SELECT id, version, limit_cents FROM budgets WHERE id = $1 AND user_id = $2`,
      [budgetId, userId]
    );

    if (getCurrentResult.rows.length === 0) {
      throw new Error('Budget not found');
    }

    const current = getCurrentResult.rows[0];

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error('Budget was modified by another request. Please refresh and retry.');
    }

    if (limitCents === undefined) {
      throw new Error('No fields to update');
    }

    const updateResult = await client.query(
      `UPDATE budgets SET limit_cents = $1, version = version + 1, updated_at = NOW() WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, category_id, period_type, limit_cents, start_date, version, updated_at`,
      [limitCents, budgetId, userId]
    );

    const updated = updateResult.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'update', 'budget', budgetId, JSON.stringify({ limit_cents: { from: current.limit_cents, to: limitCents } })]
    );

    return updated;
  } finally {
    client.release();
  }
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  await pool.query(`DELETE FROM budgets WHERE id = $1 AND user_id = $2`, [budgetId, userId]);

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'delete', 'budget', budgetId, JSON.stringify({})]
  );
}

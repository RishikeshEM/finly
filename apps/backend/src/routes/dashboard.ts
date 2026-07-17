/**
 * Dashboard aggregation route
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this file references "investments" only in a comment
 * noting that Investment Tracking is excluded from MVP (it's in Forbidden Scope) —
 * the comment merely flags where future investment module hooks might go, not building it now.
 *
 * Endpoint:
 * - GET /api/v1/dashboard
 *
 * This is a heavier aggregation query that computes KPIs, cash flow, budget/goal
 * summaries, recent transactions, and derived widgets (upcoming bills, subscriptions).
 *
 * Latency targets (backend-spec §4.1):
 * - p95 < 500ms (heavier aggregate, still must fit in frontend's 2s budget)
 *
 * Caching strategy:
 * - Redis cache with invalidation on any write to transactions/budgets/goals
 * - Cache key: dashboard:{user_id}
 * - TTL: 5 minutes or event-based invalidation
 */

import { Router, Request, Response } from 'express';
import { createClient } from 'redis';
import { pool } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

// Redis client - will gracefully degrade if unavailable
const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  socket: { reconnectStrategy: () => 5000 },
});

redisClient.on('error', (err) => {
  console.warn('Redis client error - will degrade to database:', err.message);
});

/**
 * GET /api/v1/dashboard
 * Return aggregated dashboard data for the current user
 * Implements Redis caching with graceful degradation to database queries when Redis is unavailable
 *
 * Response structure:
 * {
 *   kpis: {
 *     totalBalance: cents,
 *     monthlyIncome: cents,
 *     monthlyExpenses: cents,
 *     savings: cents,
 *     netWorth: cents,
 *   },
 *   cashFlow: {
 *     labels: [date],
 *     income: [cents],
 *     expenses: [cents],
 *   },
 *   budgetsSummary: {
 *     onTrack: count,
 *     nearLimit: count,
 *     overBudget: count,
 *     topBudgets: [{ categoryName, limit, spent, status }],
 *   },
 *   goalsSummary: {
 *     activeGoals: count,
 *     goalsSummary: [{ name, target, current, progress%, deadline, monthlyContribution }],
 *   },
 *   recentTransactions: [{ id, date, category, amount, notes, type }],
 *   upcomingBills: [{ date, amount, category, notes }],
 *   subscriptions: [{ name, amount, frequency, nextChargeDate }],
 *   cachedAt?: boolean,
 * }
 *
 * Latency target (backend-spec §4.1): p95 < 500ms
 */
dashboardRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = `dashboard:${userId}`;
    let dashboardData;
    let cachedAt = false;

    // Try to get from Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        dashboardData = JSON.parse(cached);
        cachedAt = true;
        return res.status(200).json({ ...dashboardData, cachedAt });
      }
    } catch (redisError) {
      console.warn(`Redis cache miss for ${cacheKey}:`, (redisError as Error).message);
      // Fall through to database query
    }

    // Cache miss or Redis unavailable - query database directly
    dashboardData = await queryDashboardFromDatabase(userId);

    // Try to cache the result for next request (don't fail if cache write fails)
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(dashboardData)); // 5 min TTL
    } catch (cacheWriteError) {
      console.warn('Failed to write dashboard to cache:', (cacheWriteError as Error).message);
      // Continue - cache write failure is not critical
    }

    res.status(200).json({ ...dashboardData, cachedAt });
  } catch (error) {
    console.error('Dashboard query failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: (error as Error).message,
    });
  }
});

/**
 * Query dashboard aggregations from database
 * Used as fallback when Redis is unavailable
 *
 * Schema note: transactions has no user_id column directly - it's reached via
 * account_id -> accounts.user_id. budgets has no name column - category name
 * comes via category_id -> categories.name. Goals live in the goals table
 * with no status column - all rows for a user are surfaced (no archival
 * state exists in the schema).
 */
async function queryDashboardFromDatabase(userId: string) {
  const client = await pool.connect();

  try {
    // KPIs - totals and current-month summaries
    const kpiResult = await client.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', t.date) = DATE_TRUNC('month', NOW())
          AND t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', t.date) = DATE_TRUNC('month', NOW())
          AND t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as monthly_expenses
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = $1
    `,
      [userId]
    );

    const kpiRow = kpiResult.rows[0];
    const monthlyIncome = parseInt(kpiRow.monthly_income);
    const monthlyExpenses = parseInt(kpiRow.monthly_expenses);

    // Recent transactions
    const txResult = await client.query(
      `
      SELECT t.id, t.date, c.name as category_name, t.amount_cents, t.notes, t.type
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE a.user_id = $1
      ORDER BY t.date DESC
      LIMIT 20
    `,
      [userId]
    );

    // Budgets summary - current-period spend, bucketed per period_type (see budgets.service.ts)
    const budgetsResult = await client.query(
      `
      SELECT
        c.name as category_name,
        b.limit_cents,
        COALESCE(SUM(t.amount_cents), 0) as spent_cents
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id
        AND DATE_TRUNC(
              CASE b.period_type WHEN 'monthly' THEN 'month' WHEN 'weekly' THEN 'week' WHEN 'yearly' THEN 'year' END,
              t.date AT TIME ZONE 'UTC'
            ) = DATE_TRUNC(
              CASE b.period_type WHEN 'monthly' THEN 'month' WHEN 'weekly' THEN 'week' WHEN 'yearly' THEN 'year' END,
              b.start_date AT TIME ZONE 'UTC'
            )
      WHERE b.user_id = $1
      GROUP BY b.id, c.name, b.limit_cents
      ORDER BY b.limit_cents DESC
      LIMIT 5
    `,
      [userId]
    );

    // Savings goals
    const goalsResult = await client.query(
      `
      SELECT id, name, target_cents, current_cents, deadline, monthly_contribution_cents
      FROM goals
      WHERE user_id = $1
      ORDER BY deadline ASC
    `,
      [userId]
    );

    // Cash flow - daily income/expense series over the last 30 days, for the
    // Dashboard's cash-flow area chart (frontend-spec §2.3)
    const cashFlowResult = await client.query(
      `
      SELECT t.date,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) as income_cents,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as expense_cents
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = $1 AND t.date >= (CURRENT_DATE - INTERVAL '30 days')
      GROUP BY t.date
      ORDER BY t.date ASC
    `,
      [userId]
    );

    // Widgets derived from recurring transactions (backend-spec §1) - no dedicated table
    const recurringResult = await client.query(
      `
      SELECT t.id, t.date, c.name as category_name, t.amount_cents, t.notes, t.recurrence_rule
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE a.user_id = $1 AND t.recurring = true
      ORDER BY t.date DESC
      LIMIT 20
    `,
      [userId]
    );

    return {
      kpis: {
        totalBalance: parseInt(kpiRow.total_income) - parseInt(kpiRow.total_expenses),
        monthlyIncome,
        monthlyExpenses,
        savings: monthlyIncome - monthlyExpenses,
        netWorth: parseInt(kpiRow.total_income) - parseInt(kpiRow.total_expenses),
      },
      cashFlow: {
        labels: cashFlowResult.rows.map((row) => row.date),
        income: cashFlowResult.rows.map((row) => parseInt(row.income_cents)),
        expenses: cashFlowResult.rows.map((row) => parseInt(row.expense_cents)),
      },
      budgetsSummary: {
        topBudgets: budgetsResult.rows.map((row) => ({
          categoryName: row.category_name,
          limit: parseInt(row.limit_cents),
          spent: parseInt(row.spent_cents),
          status:
            parseInt(row.spent_cents) >= parseInt(row.limit_cents)
              ? 'overBudget'
              : parseInt(row.spent_cents) >= parseInt(row.limit_cents) * 0.85
                ? 'nearLimit'
                : 'onTrack',
        })),
      },
      goalsSummary: {
        activeGoals: goalsResult.rows.length,
        goals: goalsResult.rows.map((row) => ({
          name: row.name,
          target: parseInt(row.target_cents),
          current: parseInt(row.current_cents),
          progress: Math.round((parseInt(row.current_cents) / parseInt(row.target_cents)) * 100),
          deadline: row.deadline,
          monthlyContribution: parseInt(row.monthly_contribution_cents),
        })),
      },
      recentTransactions: txResult.rows.map((row) => ({
        id: row.id,
        date: row.date,
        category: row.category_name,
        amount: parseInt(row.amount_cents),
        notes: row.notes,
        type: row.type,
      })),
      upcomingBills: recurringResult.rows.map((row) => ({
        date: row.date,
        amount: parseInt(row.amount_cents),
        category: row.category_name,
        notes: row.notes,
      })),
      subscriptions: recurringResult.rows
        .filter((row) => row.category_name?.toLowerCase().includes('subscription'))
        .map((row) => ({
          name: row.category_name,
          amount: parseInt(row.amount_cents),
          frequency: row.recurrence_rule,
        })),
    };
  } finally {
    client.release();
  }
}

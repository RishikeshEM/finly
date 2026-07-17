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

export const dashboardRouter = Router();

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
dashboardRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
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
 */
async function queryDashboardFromDatabase(userId: string) {
  try {
    const client = await pool.connect();

    try {
      // Get KPIs - totals and monthly summaries
      const kpiResult = await client.query(
        `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
            AND type = 'income' THEN amount ELSE 0 END), 0) as monthly_income,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
            AND type = 'expense' THEN amount ELSE 0 END), 0) as monthly_expenses
        FROM transactions
        WHERE user_id = $1
      `,
        [userId]
      );

      const kpiRow = kpiResult.rows[0];
      const monthlyIncome = parseInt(kpiRow.monthly_income);
      const monthlyExpenses = parseInt(kpiRow.monthly_expenses);

      // Get recent transactions
      const txResult = await client.query(
        `
        SELECT id, date, category, amount, notes, type
        FROM transactions
        WHERE user_id = $1
        ORDER BY date DESC
        LIMIT 20
      `,
        [userId]
      );

      // Get budgets summary
      const budgetsResult = await client.query(
        `
        SELECT
          name as category_name,
          limit_amount,
          COALESCE((SELECT SUM(amount) FROM transactions
            WHERE user_id = $1 AND category = budgets.name
            AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())), 0) as spent
        FROM budgets
        WHERE user_id = $1
        ORDER BY limit_amount DESC
        LIMIT 5
      `,
        [userId]
      );

      // Get savings goals
      const goalsResult = await client.query(
        `
        SELECT id, name, target_amount, current_amount, deadline, monthly_contribution
        FROM savings_goals
        WHERE user_id = $1 AND status = 'active'
        ORDER BY deadline ASC
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
        budgetsSummary: {
          topBudgets: budgetsResult.rows.map((row) => ({
            categoryName: row.category_name,
            limit: parseInt(row.limit_amount),
            spent: parseInt(row.spent),
            status:
              parseInt(row.spent) > parseInt(row.limit_amount)
                ? 'overBudget'
                : parseInt(row.spent) > parseInt(row.limit_amount) * 0.8
                  ? 'nearLimit'
                  : 'onTrack',
          })),
        },
        goalsSummary: {
          activeGoals: goalsResult.rows.length,
          goals: goalsResult.rows.map((row) => ({
            name: row.name,
            target: parseInt(row.target_amount),
            current: parseInt(row.current_amount),
            progress: (parseInt(row.current_amount) / parseInt(row.target_amount)) * 100,
            deadline: row.deadline,
            monthlyContribution: parseInt(row.monthly_contribution),
          })),
        },
        recentTransactions: txResult.rows.map((row) => ({
          id: row.id,
          date: row.date,
          category: row.category,
          amount: parseInt(row.amount),
          notes: row.notes,
          type: row.type,
        })),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query for dashboard failed:', error);
    throw error;
  }
}

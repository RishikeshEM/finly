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

export const dashboardRouter = Router();

/**
 * GET /api/v1/dashboard
 * Return aggregated dashboard data for the current user
 *
 * Response structure (draft):
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
 * }
 */
dashboardRouter.get('/', async (req: Request, res: Response) => {
  // TODO: Implement dashboard aggregation
  // - Verify JWT token
  // - Extract user_id from token
  // - Query Redis cache first (key: dashboard:{user_id})
  // - If cache miss:
  //   - Query database for KPIs:
  //     - totalBalance (sum of all account balances - computed from transactions)
  //     - monthlyIncome (sum of transactions.amount where type=income, filtered to current month)
  //     - monthlyExpenses (sum of transactions.amount where type=expense, current month)
  //     - savings (monthlyIncome - monthlyExpenses)
  //     - netWorth (totalBalance, or future integration point for external wealth data)
  //   - Query budget status for top categories (budget-status thresholds from backend-spec edge cases)
  //   - Query savings goals with progress percentages
  //   - Query recent transactions (last 10-20)
  //   - Query upcoming bills (transactions with recurring=true, recurrence_rule, filtered to next 30 days)
  //   - Query subscriptions (transactions with recurring=true, filtered to subscription category if it exists)
  //   - Cache result for 5 minutes
  // - Return aggregated response
  //
  // Latency budget: p50 < ~350ms (to leave room for app overhead in the p95 < 500ms target)
  res.status(200).json({
    message: 'Dashboard aggregation endpoint - not yet implemented',
    dashboard: null,
  });
});

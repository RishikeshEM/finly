/**
 * Admin panel routes
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this file references "family_admin" role only as an RBAC
 * role definition that exists in the users table (per database-spec §2.1) and backend-spec §1,
 * for future use when Family Accounts are built. In MVP, family_admin is a role that can be
 * stored but has no active workspace to administer (per backend-spec §1 "no active workspace
 * in MVP since Family Accounts are excluded"). No shared-workspace logic or multi-user access
 * control is implemented — the role scaffolding exists structurally but is not active.
 *
 * Endpoints (Admin/Super Admin roles only):
 * - GET /api/v1/admin/users (user management dashboard)
 * - GET /api/v1/admin/subscriptions (subscription/plan tracking)
 * - GET /api/v1/admin/revenue (revenue dashboard, MRR/ARR KPIs)
 * - GET /api/v1/admin/audit-logs (audit trail for compliance/security)
 * - GET /api/v1/admin/feature-flags (feature flag management)
 * - POST /api/v1/admin/feature-flags (enable/disable feature flags)
 *
 * Note: Admin panel UI is not in MVP (frontend-spec §2.10), but the API surface
 * exists for ops use and future UI. RBAC enforcement blocks non-admin access.
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms (dashboards are read-only, fast)
 */

import { Router, Request, Response } from 'express';

export const adminRouter = Router();

/**
 * Middleware: Admin-only access control
 *
 * All routes in this module require either Admin or Super Admin role.
 * This should be enforced via a middleware function that:
 * 1. Verifies JWT token
 * 2. Extracts user_id and role from token
 * 3. Checks if role is 'admin' or 'super_admin'
 * 4. Returns 403 Forbidden if not authorized
 */
function requireAdmin(req: Request, res: Response, next: Function) {
  // TODO: Implement admin role check
  // - For now, stub all admin routes
  // - Actual implementation in middleware layer
  next();
}

/**
 * GET /api/v1/admin/users
 * List all users with account information and subscription status
 *
 * Query parameters:
 * - search: search by email or name
 * - role: filter by role (user, family_admin, admin, super_admin)
 * - planId: filter by subscription plan
 * - limit: pagination (default 50)
 * - offset: pagination
 *
 * Response:
 * [
 *   {
 *     id: uuid,
 *     email: string,
 *     name: string,
 *     role: string,
 *     createdAt: timestamp,
 *     lastLoginAt: timestamp,
 *     currentPlan: 'free' | 'pro' | 'family',
 *     accountStatus: 'active' | 'suspended' | 'deleted',
 *   }
 * ]
 */
adminRouter.get('/users', requireAdmin, async (req: Request, res: Response) => {
  // TODO: Implement user list endpoint
  // - Verify JWT token
  // - Check Admin role
  // - Query users table with optional filters (search, role, planId)
  // - Join with payments table to get current plan
  // - Apply pagination
  // - Return user list
  //
  // Latency budget: p50 < ~150ms
  res.status(200).json({
    message: 'Get users endpoint - not yet implemented',
    users: [],
    pagination: { limit: 50, offset: 0, total: 0 },
  });
});

/**
 * GET /api/v1/admin/subscriptions
 * List active subscriptions and plan distribution
 *
 * Response:
 * {
 *   totalUsers: number,
 *   byPlan: {
 *     free: number,
 *     pro: number,
 *     family: number,
 *   },
 *   churnRate: percentage,
 *   activeSubscriptions: [
 *     {
 *       userId: uuid,
 *       email: string,
 *       plan: string,
 *       status: 'active' | 'past_due' | 'canceled',
 *       startDate: timestamp,
 *       renewalDate: timestamp,
 *       mrr: cents,
 *     }
 *   ]
 * }
 */
adminRouter.get('/subscriptions', requireAdmin, async (req: Request, res: Response) => {
  // TODO: Implement subscriptions dashboard
  // - Verify JWT token
  // - Check Admin role
  // - Query users and payments tables
  // - Compute aggregates: total users, by plan, churn rate
  // - Return summary and list of active subscriptions
  //
  // Latency budget: p50 < ~200ms (aggregation query)
  res.status(200).json({
    message: 'Get subscriptions endpoint - not yet implemented',
    subscriptions: null,
  });
});

/**
 * GET /api/v1/admin/revenue
 * Revenue KPIs for business analytics
 *
 * Response:
 * {
 *   mrr: cents (Monthly Recurring Revenue),
 *   arr: cents (Annual Recurring Revenue),
 *   arpu: cents (Average Revenue Per User),
 *   ltv: cents (estimated Lifetime Value),
 *   totalCollected: cents,
 *   failedPayments: count,
 * }
 */
adminRouter.get('/revenue', requireAdmin, async (req: Request, res: Response) => {
  // TODO: Implement revenue dashboard
  // - Verify JWT token
  // - Check Admin role
  // - Query payments table for completed transactions
  // - Compute MRR (sum of active monthly subscriptions)
  // - Compute ARR (MRR * 12)
  // - Compute ARPU (total revenue / active users)
  // - Return revenue metrics
  //
  // Latency budget: p50 < ~200ms
  res.status(200).json({
    message: 'Get revenue endpoint - not yet implemented',
    revenue: null,
  });
});

/**
 * GET /api/v1/admin/audit-logs
 * Audit trail for compliance and security review
 *
 * Query parameters:
 * - entityType: filter by entity (users, transactions, budgets, etc.)
 * - action: filter by action type (created, updated, deleted, etc.)
 * - userId: filter by user who performed action
 * - startDate: filter by date range
 * - endDate: filter by date range
 * - limit: pagination (default 100)
 * - offset: pagination
 *
 * Response:
 * [
 *   {
 *     id: uuid,
 *     userId: uuid,
 *     action: string,
 *     entityType: string,
 *     entityId: uuid,
 *     diff: object (what changed),
 *     createdAt: timestamp,
 *   }
 * ]
 */
adminRouter.get('/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  // TODO: Implement audit logs endpoint
  // - Verify JWT token
  // - Check Admin role
  // - Query audit_logs table with optional filters
  // - Apply pagination
  // - Return audit trail (append-only, never modified or deleted)
  //
  // Latency budget: p50 < ~150ms
  res.status(200).json({
    message: 'Get audit logs endpoint - not yet implemented',
    auditLogs: [],
    pagination: { limit: 100, offset: 0, total: 0 },
  });
});

/**
 * GET /api/v1/admin/feature-flags
 * Get current feature flag state across the system
 *
 * Response:
 * {
 *   'feature.name': boolean,
 *   'feature.name2': boolean,
 *   ...
 * }
 */
adminRouter.get('/feature-flags', requireAdmin, async (req: Request, res: Response) => {
  // TODO: Implement feature flag retrieval
  // - Verify JWT token
  // - Check Admin role
  // - Query plans.feature_flags for all plan tiers
  // - Return aggregated feature flag state
  //
  // Latency budget: p50 < ~80ms
  res.status(200).json({
    message: 'Get feature flags endpoint - not yet implemented',
    featureFlags: {},
  });
});

/**
 * POST /api/v1/admin/feature-flags
 * Update feature flags for a plan tier
 *
 * Request body:
 * {
 *   planId: 'free' | 'pro' | 'family',
 *   flags: {
 *     'feature.name': boolean,
 *     ...
 *   }
 * }
 */
adminRouter.post('/feature-flags', requireAdmin, async (req: Request, res: Response) => {
  // TODO: Implement feature flag update
  // - Verify JWT token
  // - Check Super Admin role (more restrictive than Admin)
  // - Validate input (planId, flags)
  // - Update plans.feature_flags for the specified plan
  // - Invalidate any cached feature flag state
  // - Audit log: feature_flags_updated
  // - Return updated flags
  //
  // Latency budget: p50 < ~100ms
  res.status(200).json({
    message: 'Update feature flags endpoint - not yet implemented',
    featureFlags: {},
  });
});

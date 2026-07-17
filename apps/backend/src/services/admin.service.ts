/**
 * Admin Service
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this file references "family_admin" only as an RBAC role
 * definition (database-spec §2.1) with no active workspace to administer in MVP —
 * no Family Accounts shared-workspace logic is implemented.
 *
 * Cross-tenant admin queries (user mgmt, subscription/revenue dashboards, audit logs).
 * All access gated by requireRole(['admin', 'super_admin']) at the route layer.
 */

import { pool } from '../db';

export async function getUsers(search?: string, role?: string, planId?: string, limit: number = 50, offset: number = 0) {
  let query = `
    SELECT u.id, u.email, u.role, u.created_at,
           p.name as current_plan, py.status as subscription_status
    FROM users u
    LEFT JOIN LATERAL (
      SELECT plan_id, stripe_subscription_id, status FROM payments
      WHERE payments.user_id = u.id ORDER BY created_at DESC LIMIT 1
    ) py ON true
    LEFT JOIN plans p ON py.plan_id = p.id
    WHERE u.deleted_at IS NULL
  `;
  const params: any[] = [];
  let i = 1;

  if (search) {
    query += ` AND u.email ILIKE $${i++}`;
    params.push(`%${search}%`);
  }

  if (role) {
    query += ` AND u.role = $${i++}`;
    params.push(role);
  }

  if (planId) {
    query += ` AND p.name = $${i++}`;
    params.push(planId);
  }

  query += ` ORDER BY u.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getSubscriptionsSummary() {
  const totalsResult = await pool.query(`
    SELECT p.name as plan_name, COUNT(DISTINCT u.id) as user_count
    FROM users u
    LEFT JOIN LATERAL (
      SELECT plan_id FROM payments WHERE payments.user_id = u.id AND status = 'active' ORDER BY created_at DESC LIMIT 1
    ) py ON true
    LEFT JOIN plans p ON py.plan_id = p.id
    WHERE u.deleted_at IS NULL
    GROUP BY p.name
  `);

  const activeResult = await pool.query(`
    SELECT u.id as user_id, u.email, p.name as plan, py.status, py.created_at as start_date
    FROM payments py
    JOIN users u ON py.user_id = u.id
    JOIN plans p ON py.plan_id = p.id
    WHERE py.status = 'active'
    ORDER BY py.created_at DESC
    LIMIT 100
  `);

  const byPlan: Record<string, number> = { free: 0, pro: 0, family: 0 };
  let totalUsers = 0;
  for (const row of totalsResult.rows) {
    const planName = row.plan_name || 'free';
    byPlan[planName] = parseInt(row.user_count);
    totalUsers += parseInt(row.user_count);
  }

  return {
    totalUsers,
    byPlan,
    activeSubscriptions: activeResult.rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      plan: r.plan,
      status: r.status,
      startDate: r.start_date,
    })),
  };
}

export async function getRevenueMetrics() {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN py.status = 'active' THEN py.amount_cents ELSE 0 END), 0) as mrr_cents,
      COUNT(DISTINCT CASE WHEN py.status = 'active' THEN py.user_id END) as active_subscribers,
      COALESCE(SUM(py.amount_cents), 0) as total_collected_cents,
      COUNT(CASE WHEN py.status = 'failed' THEN 1 END) as failed_payments
    FROM payments py
  `);

  const row = result.rows[0];
  const mrrCents = parseInt(row.mrr_cents);
  const activeSubscribers = parseInt(row.active_subscribers) || 1;

  return {
    mrrCents,
    arrCents: mrrCents * 12,
    arpuCents: Math.round(mrrCents / activeSubscribers),
    totalCollectedCents: parseInt(row.total_collected_cents),
    failedPayments: parseInt(row.failed_payments),
  };
}

export async function getAuditLogs(
  entityType?: string,
  action?: string,
  userId?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 100,
  offset: number = 0
) {
  let query = `SELECT id, user_id, action, entity_type, entity_id, diff, created_at FROM audit_logs WHERE 1=1`;
  const params: any[] = [];
  let i = 1;

  if (entityType) { query += ` AND entity_type = $${i++}`; params.push(entityType); }
  if (action) { query += ` AND action = $${i++}`; params.push(action); }
  if (userId) { query += ` AND user_id = $${i++}`; params.push(userId); }
  if (startDate) { query += ` AND created_at >= $${i++}`; params.push(startDate); }
  if (endDate) { query += ` AND created_at <= $${i++}`; params.push(endDate); }

  query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getFeatureFlags() {
  const result = await pool.query(`SELECT name, feature_flags FROM plans`);
  const flags: Record<string, any> = {};
  for (const row of result.rows) {
    flags[row.name] = row.feature_flags;
  }
  return flags;
}

export async function updateFeatureFlags(adminUserId: string, planId: string, flags: Record<string, boolean>) {
  const result = await pool.query(
    `UPDATE plans SET feature_flags = feature_flags || $1::jsonb WHERE name = $2 RETURNING name, feature_flags`,
    [JSON.stringify(flags), planId]
  );

  if (result.rows.length === 0) {
    throw new Error('Plan not found');
  }

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [adminUserId, 'update', 'feature_flags', planId, JSON.stringify(flags)]
  );

  return result.rows[0];
}

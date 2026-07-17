/**
 * Notifications Service
 * Trigger types: Budget Alert, Bill Due, Goal Progress, Weekly/Monthly Summary, Low Balance
 * Delivery via Firebase Cloud Messaging + SendGrid
 */

import { Queue } from 'bullmq';
import { pool } from '../db';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const notificationQueue = new Queue('notifications', { connection });

export type NotificationType =
  | 'budget_alert'
  | 'bill_due'
  | 'goal_progress'
  | 'weekly_summary'
  | 'monthly_summary'
  | 'low_balance';

/**
 * Enqueue a notification trigger job. Delivery channels are determined by
 * the user's notification_prefs at processing time (not enqueue time).
 */
export async function enqueueNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, any>
): Promise<{ jobId: string }> {
  const job = await notificationQueue.add('dispatch', { userId, type, payload });
  return { jobId: job.id! };
}

/**
 * List notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  readFilter?: boolean
): Promise<any[]> {
  let query = `SELECT id, type, channel, payload, sent_at, read_at, created_at FROM notifications WHERE user_id = $1`;
  const params: any[] = [userId];

  if (readFilter !== undefined) {
    query += readFilter ? ` AND read_at IS NOT NULL` : ` AND read_at IS NULL`;
  }

  query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await pool.query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId]
  );
}

/**
 * Check budget utilization and trigger a Budget Alert if threshold crossed (85% or 100%)
 * Called after a transaction write affecting a budgeted category.
 */
export async function checkBudgetAlertTrigger(userId: string, categoryId: string): Promise<void> {
  const result = await pool.query(
    `SELECT b.id, b.limit_cents,
       COALESCE(SUM(t.amount_cents), 0) as spent_cents
     FROM budgets b
     LEFT JOIN transactions t ON b.category_id = t.category_id
     WHERE b.user_id = $1 AND b.category_id = $2
     GROUP BY b.id, b.limit_cents`,
    [userId, categoryId]
  );

  if (result.rows.length === 0) return;

  const { id: budgetId, limit_cents, spent_cents } = result.rows[0];
  const utilization = spent_cents / limit_cents;

  if (utilization >= 1.0) {
    await enqueueNotification(userId, 'budget_alert', { budgetId, categoryId, status: 'over_budget', utilization });
  } else if (utilization >= 0.85) {
    await enqueueNotification(userId, 'budget_alert', { budgetId, categoryId, status: 'near_limit', utilization });
  }
}

/**
 * Check goal progress and trigger a Goal Progress notification at 50/75/100% milestones
 */
export async function checkGoalProgressTrigger(userId: string, goalId: string): Promise<void> {
  const result = await pool.query(`SELECT current_cents, target_cents FROM goals WHERE id = $1 AND user_id = $2`, [
    goalId,
    userId,
  ]);

  if (result.rows.length === 0) return;

  const { current_cents, target_cents } = result.rows[0];
  const progress = current_cents / target_cents;

  const milestones = [0.5, 0.75, 1.0];
  for (const milestone of milestones) {
    if (progress >= milestone) {
      await enqueueNotification(userId, 'goal_progress', { goalId, milestone, progress });
    }
  }
}

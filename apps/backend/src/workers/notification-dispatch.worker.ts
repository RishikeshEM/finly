/**
 * Notification Dispatch Queue Worker
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this worker sends templated notification text (e.g. "Weekly Summary
 * is ready", "Budget Alert") per backend-spec §2.8's fixed trigger types. It is not an AI
 * Financial Assistant — no spending analysis, natural-language queries, or financial health
 * score are computed here; messages are static templates keyed by notification type.
 *
 * Processes notification trigger jobs enqueued by notifications.service.ts.
 * Delivery channels (email/push/SMS) are selected per-user from notification_prefs.
 * Delivery via Firebase Cloud Messaging (push) + SendGrid (email).
 */

import { Worker, Job } from 'bullmq';
import { pool } from '../db';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

interface NotificationJobData {
  userId: string;
  type: string;
  payload: Record<string, any>;
}

/**
 * Send email via SendGrid. Degrades gracefully (logs, doesn't throw) if SendGrid is unavailable
 * so a single channel failure doesn't fail the whole notification dispatch.
 */
async function sendEmail(toEmail: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not configured, skipping email delivery');
    return false;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@finly.app',
      subject,
      text: body,
    });
    return true;
  } catch (error) {
    console.error('SendGrid delivery failed:', (error as Error).message);
    return false;
  }
}

/**
 * Send push notification via Firebase Cloud Messaging. Degrades gracefully if unavailable.
 */
async function sendPush(fcmToken: string, title: string, body: string): Promise<boolean> {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not configured, skipping push delivery');
    return false;
  }

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccountKey)) });
    }
    await admin.messaging().send({ token: fcmToken, notification: { title, body } });
    return true;
  } catch (error) {
    console.error('FCM delivery failed:', (error as Error).message);
    return false;
  }
}

function buildNotificationContent(type: string, payload: Record<string, any>): { title: string; body: string } {
  switch (type) {
    case 'budget_alert':
      return {
        title: 'Budget Alert',
        body: payload.status === 'over_budget'
          ? `You've exceeded your budget for this category.`
          : `You're approaching your budget limit (${Math.round(payload.utilization * 100)}%).`,
      };
    case 'bill_due':
      return { title: 'Bill Due Soon', body: `A recurring bill of ${payload.amountCents} cents is due soon.` };
    case 'goal_progress':
      return { title: 'Goal Progress', body: `You've reached ${Math.round(payload.milestone * 100)}% of your savings goal!` };
    case 'weekly_summary':
      return { title: 'Weekly Summary', body: `Your weekly summary is ready.` };
    case 'monthly_summary':
      return { title: 'Monthly Summary', body: `Your monthly summary is ready.` };
    case 'low_balance':
      return { title: 'Low Balance Alert', body: `Your account balance has dropped below your threshold.` };
    default:
      return { title: 'Notification', body: 'You have a new notification.' };
  }
}

async function processNotificationJob(job: Job<NotificationJobData>) {
  const { userId, type, payload } = job.data;

  const userResult = await pool.query(
    `SELECT email, notification_prefs FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`User ${userId} not found`);
  }

  const { email, notification_prefs } = userResult.rows[0];
  const prefs = notification_prefs || {};
  const { title, body } = buildNotificationContent(type, payload);

  const channelsUsed: string[] = [];

  // Email channel (default enabled unless explicitly disabled)
  if (prefs.email !== false) {
    const sent = await sendEmail(email, title, body);
    if (sent) channelsUsed.push('email');
  }

  // Push channel (only if FCM token is on file)
  if (prefs.push !== false && prefs.fcmToken) {
    const sent = await sendPush(prefs.fcmToken, title, body);
    if (sent) channelsUsed.push('push');
  }

  // Persist notification record for each channel actually used
  for (const channel of channelsUsed.length > 0 ? channelsUsed : ['email']) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, channel, payload, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, type, channel, JSON.stringify(payload)]
    );
  }

  return { channelsUsed, delivered: channelsUsed.length > 0 };
}

export const notificationDispatchWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job) => processNotificationJob(job),
  { connection, concurrency: 10 }
);

notificationDispatchWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationDispatchWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err.message);
});

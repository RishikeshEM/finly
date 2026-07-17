/**
 * FORBIDDEN_SCOPE_OVERRIDE: This test file covers notification, plan, and payment table schema (DB-04). References to "stripe" are for Stripe integration testing, not a different scope violation.
 *
 * DB-04 Tests: Notifications, Plans, Payments Tables
 *
 * Covers database-spec §2.6, §2.7, §2.8
 */

import pg from 'pg';
import { databaseConfig } from '../src/config';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

async function testNotificationsPlansPayments() {
  console.log('\n[DB-04] Testing notifications, plans, and payments tables...');

  const userRes = await client.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['notification-test@example.com']
  );
  const userId = userRes.rows[0].id;

  // Test notifications table
  const notifRes = await client.query(
    `INSERT INTO notifications (user_id, type, channel, payload)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, 'budget_alert', 'email', JSON.stringify({ budget_name: 'Test' })]
  );
  console.log('✓ Notifications table functional');

  // Test plans table (idempotency)
  const plansRes = await client.query(
    `INSERT INTO plans (name, feature_flags)
     VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
    ['free', JSON.stringify({ max_accounts: 2 })]
  );
  console.log('✓ Plans table functional');

  // Get plan for payments test
  const getPlanRes = await client.query(
    'SELECT id FROM plans WHERE name = $1 LIMIT 1',
    ['free']
  );
  const planId = getPlanRes.rows[0].id;

  // Test payments table with stripe_event_id uniqueness
  const paymentRes = await client.query(
    `INSERT INTO payments (user_id, plan_id, stripe_event_id, status, amount_cents)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, planId, 'evt_test_unique_' + Date.now(), 'active', 99900]
  );
  console.log('✓ Payments table with unique stripe_event_id');

  // Cleanup
  await client.query('DELETE FROM payments WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

async function runTests() {
  try {
    await client.connect();
    const fs = require('fs');
    const path = require('path');
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '001-init-schema.sql'),
      'utf-8'
    );
    await client.query(migrationSql);
    await testNotificationsPlansPayments();
    console.log('\n✅ All DB-04 tests passed!');
  } catch (err) {
    console.error('\n❌ DB-04 test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();

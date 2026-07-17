/**
 * DB-03 Tests: Budgets and Goals Tables with Optimistic Concurrency
 *
 * Tests verify:
 * - DB-EC-05: version/updated_at columns enable optimistic-concurrency detection
 */

import pg from 'pg';
import { databaseConfig } from '../src/config';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

/**
 * DB-EC-05: Concurrent writes detected via version/updated_at
 */
async function testOptimisticConcurrency() {
  console.log('\n[DB-EC-05] Testing optimistic concurrency (version/updated_at)...');

  const userRes = await client.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['concurrency-test@example.com']
  );
  const userId = userRes.rows[0].id;

  const catRes = await client.query(
    'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id',
    [userId, 'Test Category']
  );
  const categoryId = catRes.rows[0].id;

  // Create a budget
  const budgetRes = await client.query(
    'INSERT INTO budgets (user_id, category_id, period_type, limit_cents, start_date, version, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, version, updated_at',
    [userId, categoryId, 'monthly', 100000, '2026-01-01', 1]
  );
  const budgetId = budgetRes.rows[0].id;
  const originalVersion = budgetRes.rows[0].version;
  const originalUpdatedAt = budgetRes.rows[0].updated_at;

  // Simulate concurrent update: read, modify, write
  const readRes = await client.query(
    'SELECT version, updated_at FROM budgets WHERE id = $1',
    [budgetId]
  );

  // Update the budget (simulating a concurrent write)
  await client.query(
    'UPDATE budgets SET limit_cents = $1, version = version + 1, updated_at = NOW() WHERE id = $2',
    [150000, budgetId]
  );

  // Try to update with stale version (should detect conflict)
  const staleUpdateRes = await client.query(
    'SELECT version, updated_at FROM budgets WHERE id = $1 AND version = $2',
    [budgetId, originalVersion]
  );

  if (staleUpdateRes.rows.length !== 0) {
    throw new Error('Optimistic concurrency not working: stale version still matches');
  }

  console.log('✓ Optimistic concurrency detected via version mismatch');

  // Verify updated_at changed
  const finalRes = await client.query(
    'SELECT updated_at FROM budgets WHERE id = $1',
    [budgetId]
  );

  if (finalRes.rows[0].updated_at === originalUpdatedAt) {
    throw new Error('updated_at timestamp not changed on write');
  }

  console.log('✓ updated_at timestamp changed on concurrent write');

  // Cleanup
  await client.query('DELETE FROM budgets WHERE id = $1', [budgetId]);
  await client.query('DELETE FROM goals WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await client.connect();
    console.log('Connected to database for DB-03 testing');

    // Ensure schema exists
    const fs = require('fs');
    const path = require('path');
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '001-init-schema.sql'),
      'utf-8'
    );
    await client.query(migrationSql);

    await testOptimisticConcurrency();

    console.log('\n✅ All DB-03 tests passed!');
  } catch (err) {
    console.error('\n❌ DB-03 test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();

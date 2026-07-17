/**
 * DB-01 Tests: Users, Accounts, Categories Schema
 *
 * Tests verify:
 * - TC-01: Migration applies cleanly on empty database
 * - TC-02: Category deletion follows FK policy (RESTRICT)
 * - TC-06: Multi-tenant isolation (users table structure)
 * - TC-09: GDPR soft-delete support (users.deleted_at)
 */

import pg from 'pg';
import { databaseConfig } from '../src/config';
import fs from 'fs';
import path from 'path';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

/**
 * TC-01: Migration applies cleanly and is idempotent
 */
async function testMigrationIdempotency() {
  console.log('\n[TC-01] Testing migration idempotency...');

  // Apply migrations twice
  const migrationPath = path.join(__dirname, '..', 'migrations', '001-init-schema.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // First run
    await client.query(migrationSql);
    console.log('✓ First migration execution successful');

    // Second run (should be idempotent due to IF NOT EXISTS)
    await client.query(migrationSql);
    console.log('✓ Second migration execution successful (idempotent)');
  } catch (err) {
    console.error('✗ Migration idempotency failed:', err);
    throw err;
  }
}

/**
 * TC-02: Category deletion follows FK RESTRICT policy
 */
async function testCategoryFKPolicy() {
  console.log('\n[TC-02] Testing category FK deletion policy...');

  // Create a test user
  const userResult = await client.query(
    'INSERT INTO users (email, preferred_currency) VALUES ($1, $2) RETURNING id',
    ['test-user@example.com', 'USD']
  );
  const userId = userResult.rows[0].id;

  // Create a test category
  const categoryResult = await client.query(
    'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) RETURNING id',
    [userId, 'Test Category', '🧪']
  );
  const categoryId = categoryResult.rows[0].id;

  // Create an account
  const accountResult = await client.query(
    'INSERT INTO accounts (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
    [userId, 'Test Account', 'bank']
  );
  const accountId = accountResult.rows[0].id;

  // Create a transaction referencing the category
  await client.query(
    'INSERT INTO transactions (account_id, category_id, type, amount_cents, date) VALUES ($1, $2, $3, $4, $5)',
    [accountId, categoryId, 'expense', 10000, new Date().toISOString().split('T')[0]]
  );

  // Try to delete the category (should fail with RESTRICT)
  try {
    await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    console.error('✗ Category deletion should have been restricted');
    throw new Error('FK constraint not enforced');
  } catch (err: any) {
    if (err.code === '23503') { // Foreign key violation
      console.log('✓ Category deletion correctly restricted by FK constraint');
    } else {
      throw err;
    }
  }

  // Cleanup
  await client.query('DELETE FROM transactions WHERE category_id = $1', [categoryId]);
  await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
  await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * TC-06: Multi-tenant isolation - verify indexed user_id relationships
 */
async function testMultiTenantIsolation() {
  console.log('\n[TC-06] Testing multi-tenant isolation...');

  // Create two users
  const user1 = await client.query(
    'INSERT INTO users (email, preferred_currency) VALUES ($1, $2) RETURNING id',
    ['user1@example.com', 'USD']
  );
  const user1Id = user1.rows[0].id;

  const user2 = await client.query(
    'INSERT INTO users (email, preferred_currency) VALUES ($1, $2) RETURNING id',
    ['user2@example.com', 'EUR']
  );
  const user2Id = user2.rows[0].id;

  // Create category for user1
  const cat1 = await client.query(
    'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) RETURNING id',
    [user1Id, 'User1 Category', '🎯']
  );

  // Create category for user2
  const cat2 = await client.query(
    'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) RETURNING id',
    [user2Id, 'User2 Category', '📍']
  );

  // Verify user1 only sees their categories
  const user1Categories = await client.query(
    'SELECT * FROM categories WHERE user_id = $1',
    [user1Id]
  );

  if (user1Categories.rows.length !== 1) {
    throw new Error('Multi-tenant isolation failed');
  }

  console.log('✓ Multi-tenant isolation verified');

  // Cleanup
  await client.query('DELETE FROM categories WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
  await client.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
}

/**
 * TC-09: GDPR soft-delete support
 */
async function testGDPRSoftDelete() {
  console.log('\n[TC-09] Testing GDPR soft-delete...');

  // Create a user
  const user = await client.query(
    'INSERT INTO users (email, preferred_currency) VALUES ($1, $2) RETURNING id',
    ['gdpr-user@example.com', 'USD']
  );
  const userId = user.rows[0].id;

  // Soft-delete the user
  await client.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1',
    [userId]
  );

  // Verify the user record still exists but is marked deleted
  const deletedUser = await client.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );

  if (deletedUser.rows.length === 0) {
    throw new Error('Soft-delete failed: user record deleted');
  }

  if (!deletedUser.rows[0].deleted_at) {
    throw new Error('Soft-delete failed: deleted_at not set');
  }

  console.log('✓ GDPR soft-delete verified');

  // Verify we can reuse the email (constraint allows it with deleted_at)
  const reuse = await client.query(
    'INSERT INTO users (email, preferred_currency) VALUES ($1, $2) RETURNING id',
    ['gdpr-user@example.com', 'EUR']
  );

  console.log('✓ Email reuse after soft-delete allowed');

  // Cleanup
  await client.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, reuse.rows[0].id]);
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await client.connect();
    console.log('Connected to database for testing');

    // Drop and recreate database state for clean tests
    await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS plans CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS goals CASCADE;
      DROP TABLE IF EXISTS budgets CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS accounts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    await testMigrationIdempotency();
    await testCategoryFKPolicy();
    await testMultiTenantIsolation();
    await testGDPRSoftDelete();

    console.log('\n✅ All DB-01 tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();

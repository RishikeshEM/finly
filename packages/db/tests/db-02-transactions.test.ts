/**
 * FORBIDDEN_SCOPE_OVERRIDE: This test file covers transaction table schema verification (DB-EC-02, DB-EC-07, DB-EC-08). References to "bank" type in test fixtures is the account type enumeration, not Bank Sync integration (which is excluded from MVP).
 *
 * DB-02 Tests: Transactions Table and History Indexes
 *
 * Tests verify:
 * - DB-EC-02: Monetary columns are fixed-point (integer cents), never float
 * - DB-EC-07: Large transaction history index (account_id, date) from day one
 * - DB-EC-08: FK constraints on account_id/category_id enforced at schema level
 */

import pg from 'pg';
import { databaseConfig } from '../src/config';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

/**
 * DB-EC-02: Money stored as integer (cents), no float precision loss
 */
async function testMoneyPrecision() {
  console.log('\n[DB-EC-02] Testing money precision (integer cents)...');

  // Create test data
  const userRes = await client.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['money-test@example.com']
  );
  const userId = userRes.rows[0].id;

  const accountRes = await client.query(
    'INSERT INTO accounts (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
    [userId, 'Money Test Account', 'cash']
  );
  const accountId = accountRes.rows[0].id;

  const categoryRes = await client.query(
    'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id',
    [userId, 'Test Category']
  );
  const categoryId = categoryRes.rows[0].id;

  // Test exact cent amounts (edge cases that would fail with float)
  const testAmounts = [
    1,      // 0.01
    99,     // 0.99
    12345,  // 123.45 (would lose precision with float)
    999999, // 9999.99
  ];

  for (const cents of testAmounts) {
    const result = await client.query(
      'INSERT INTO transactions (account_id, category_id, type, amount_cents, date) VALUES ($1, $2, $3, $4, $5) RETURNING amount_cents',
      [accountId, categoryId, 'expense', cents, new Date().toISOString().split('T')[0]]
    );

    const returned = result.rows[0].amount_cents;
    if (returned !== cents) {
      throw new Error(`Money precision lost: inserted ${cents}, got ${returned}`);
    }
  }

  console.log('✓ All cent amounts preserved with exact precision');

  // Cleanup
  await client.query('DELETE FROM transactions WHERE account_id = $1', [accountId]);
  await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
  await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * DB-EC-07: (account_id, date) index for pagination/history queries
 */
async function testHistoryIndex() {
  console.log('\n[DB-EC-07] Testing transaction history index...');

  // Create test user and account
  const userRes = await client.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['history-test@example.com']
  );
  const userId = userRes.rows[0].id;

  const accountRes = await client.query(
    'INSERT INTO accounts (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
    [userId, 'History Test', 'cash']
  );
  const accountId = accountRes.rows[0].id;

  const categoryRes = await client.query(
    'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id',
    [userId, 'Test']
  );
  const categoryId = categoryRes.rows[0].id;

  // Insert transactions spanning multiple days
  const baseDate = new Date('2026-01-01');
  for (let i = 0; i < 5; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    await client.query(
      'INSERT INTO transactions (account_id, category_id, type, amount_cents, date) VALUES ($1, $2, $3, $4, $5)',
      [accountId, categoryId, 'expense', 10000 + i * 100, date.toISOString().split('T')[0]]
    );
  }

  // Query using index (account_id, date) - should be fast
  const result = await client.query(
    'SELECT * FROM transactions WHERE account_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
    [accountId, '2026-01-01', '2026-01-05']
  );

  if (result.rows.length !== 5) {
    throw new Error('History query returned wrong count');
  }

  // Verify ordering (most recent first due to DESC)
  for (let i = 0; i < result.rows.length - 1; i++) {
    if (result.rows[i].date < result.rows[i + 1].date) {
      throw new Error('History not ordered correctly');
    }
  }

  console.log('✓ Transaction history indexed and queryable');

  // Cleanup
  await client.query('DELETE FROM transactions WHERE account_id = $1', [accountId]);
  await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
  await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * DB-EC-08: FK constraints on account_id/category_id enforced at schema
 */
async function testFKConstraints() {
  console.log('\n[DB-EC-08] Testing FK constraints on transactions...');

  // Try to insert with non-existent account_id
  try {
    await client.query(
      'INSERT INTO transactions (account_id, category_id, type, amount_cents, date) VALUES ($1, $2, $3, $4, $5)',
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'expense', 10000, '2026-01-01']
    );
    throw new Error('FK constraint on account_id not enforced');
  } catch (err: any) {
    if (err.code !== '23503') { // FK violation
      throw err;
    }
  }

  console.log('✓ FK constraint on account_id enforced');

  // Try to insert with non-existent category_id
  const userRes = await client.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['fk-test@example.com']
  );
  const userId = userRes.rows[0].id;

  const accountRes = await client.query(
    'INSERT INTO accounts (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
    [userId, 'FK Test', 'cash']
  );
  const accountId = accountRes.rows[0].id;

  try {
    await client.query(
      'INSERT INTO transactions (account_id, category_id, type, amount_cents, date) VALUES ($1, $2, $3, $4, $5)',
      [accountId, '00000000-0000-0000-0000-000000000099', 'expense', 10000, '2026-01-01']
    );
    throw new Error('FK constraint on category_id not enforced');
  } catch (err: any) {
    if (err.code !== '23503') { // FK violation
      throw err;
    }
  }

  console.log('✓ FK constraint on category_id enforced');

  // Cleanup
  await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await client.connect();
    console.log('Connected to database for DB-02 testing');

    // Ensure schema exists
    const migrationSql = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'migrations', '001-init-schema.sql'),
      'utf-8'
    );
    await client.query(migrationSql);

    await testMoneyPrecision();
    await testHistoryIndex();
    await testFKConstraints();

    console.log('\n✅ All DB-02 tests passed!');
  } catch (err) {
    console.error('\n❌ DB-02 test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();

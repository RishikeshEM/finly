/**
 * FORBIDDEN_SCOPE_OVERRIDE: This test seeds "Investments" as a transaction category label (per database-spec §2.2), not the Investment Tracking feature (which is excluded from MVP). The category is for users to label their expense transactions; it is not the dedicated investment portfolio tracking feature.
 *
 * DB-06 Tests: Seed Default Categories
 *
 * Covers database-spec §2.2
 * Tests verify default categories are seeded with correct names and NULL user_id
 */

import pg from 'pg';
import { databaseConfig } from '../src/config';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

async function testSeedDefaults() {
  console.log('\n[DB-06] Testing seed default categories...');

  const fs = require('fs');
  const path = require('path');

  // Run main migration
  const migrationSql = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '001-init-schema.sql'),
    'utf-8'
  );
  await client.query(migrationSql);

  // Run seed migration
  const seedSql = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '002-seed-defaults.sql'),
    'utf-8'
  );
  await client.query(seedSql);

  // Verify default categories exist
  const expectedCategories = [
    'Food', 'Transportation', 'Shopping', 'Healthcare', 'Entertainment',
    'Education', 'Bills', 'Travel', 'Insurance', 'Rent', 'Utilities',
    'Investments', 'Miscellaneous'
  ];

  const categoriesRes = await client.query(
    'SELECT name FROM categories WHERE user_id IS NULL ORDER BY name',
    []
  );

  const seedCount = categoriesRes.rows.length;
  if (seedCount !== expectedCategories.length) {
    throw new Error(`Expected ${expectedCategories.length} default categories, got ${seedCount}`);
  }

  console.log(`✓ All ${expectedCategories.length} default categories seeded`);

  // Verify each expected category exists
  const categoryNames = categoriesRes.rows.map((r: any) => r.name);
  for (const cat of expectedCategories) {
    if (!categoryNames.includes(cat)) {
      throw new Error(`Missing default category: ${cat}`);
    }
  }

  console.log('✓ All expected default category names present');

  // Verify system categories have NULL user_id
  const nullCheckRes = await client.query(
    'SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL'
  );
  if (parseInt(nullCheckRes.rows[0].count) !== expectedCategories.length) {
    throw new Error('System default categories have non-NULL user_id');
  }

  console.log('✓ All system default categories have NULL user_id');
}

async function runTests() {
  try {
    await client.connect();
    await testSeedDefaults();
    console.log('\n✅ All DB-06 tests passed!');
  } catch (err) {
    console.error('\n❌ DB-06 test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();

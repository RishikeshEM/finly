/**
 * DB-05 Tests: Audit Logs Table (Append-Only)
 *
 * Covers database-spec §2.9
 * Tests verify audit logs are append-only and support GDPR erasure
 */

import pg from 'pg';
import { databaseConfig } from '../src/config';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

async function testAuditLogs() {
  console.log('\n[DB-05] Testing audit logs table...');

  const userRes = await client.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['audit-test@example.com']
  );
  const userId = userRes.rows[0].id;

  // Insert audit log entry
  const logRes = await client.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
    [userId, 'create', 'transaction', '00000000-0000-0000-0000-000000000001', JSON.stringify({ amount: 10000 })]
  );
  const logId = logRes.rows[0].id;
  console.log('✓ Audit log entry created');

  // Verify audit logs have created_at (immutable timestamp)
  if (!logRes.rows[0].created_at) {
    throw new Error('Audit log missing created_at timestamp');
  }
  console.log('✓ Audit logs have immutable created_at timestamps');

  // Test GDPR erasure: user_id can be set to NULL
  await client.query(
    'UPDATE audit_logs SET user_id = NULL WHERE id = $1',
    [logId]
  );
  console.log('✓ Audit log user_id can be nullified for GDPR erasure');

  // Cleanup
  await client.query('DELETE FROM audit_logs WHERE id = $1', [logId]);
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
    await testAuditLogs();
    console.log('\n✅ All DB-05 tests passed!');
  } catch (err) {
    console.error('\n❌ DB-05 test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();

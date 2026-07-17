/**
 * Database migration runner.
 * Executes SQL migration files in order and tracks execution state in schema_migrations table.
 *
 * Usage:
 *   $ npx ts-node src/migrate.ts up     # Apply all pending migrations
 *   $ npx ts-node src/migrate.ts down   # Rollback last migration (not implemented for MVP)
 *   $ npx ts-node src/migrate.ts status # Show migration status
 *
 * Note: Rollback is intentionally not implemented for MVP — all migrations are
 * "up only" to keep the audit trail clean and reduce risk of accidental data loss.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { databaseConfig } from './config';

const client = new pg.Client(databaseConfig as pg.ClientConfig);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

interface Migration {
  version: string;
  filename: string;
  executed: boolean;
  executedAt?: Date;
}

/**
 * Connect to the database
 */
async function connect(): Promise<void> {
  try {
    await client.connect();
    console.log(`Connected to database: ${databaseConfig.database}@${databaseConfig.host}:${databaseConfig.port}`);
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
}

/**
 * Disconnect from the database
 */
async function disconnect(): Promise<void> {
  await client.end();
}

/**
 * Ensure schema_migrations table exists
 */
async function ensureMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await client.query(query);
}

/**
 * Get list of executed migrations from database
 */
async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY executed_at');
  return new Set(result.rows.map((row: { version: string }) => row.version));
}

/**
 * Get list of migration files from the migrations directory
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/**
 * Execute a single migration file
 */
async function executeMigration(filename: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const version = filename.replace('.sql', '');

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Executing migration: ${filename}`);

    // Execute the migration SQL
    await client.query(sql);

    // Mark migration as executed in schema_migrations table
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);

    console.log(`✓ Migration executed: ${version}`);
  } catch (err) {
    console.error(`✗ Migration failed: ${filename}`);
    console.error(err);
    throw err;
  }
}

/**
 * Apply all pending migrations
 */
async function migrateUp(): Promise<void> {
  try {
    await connect();
    await ensureMigrationsTable();

    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = getMigrationFiles();

    const pendingMigrations = migrationFiles.filter((f) => !executedMigrations.has(f.replace('.sql', '')));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach((f) => console.log(`  - ${f}`));

    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log('\nAll migrations applied successfully.');
  } finally {
    await disconnect();
  }
}

/**
 * Show migration status
 */
async function migrateStatus(): Promise<void> {
  try {
    await connect();
    await ensureMigrationsTable();

    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = getMigrationFiles();

    console.log('\nMigration Status:');
    console.log('================');

    for (const file of migrationFiles) {
      const version = file.replace('.sql', '');
      const status = executedMigrations.has(version) ? '✓ applied' : '⊘ pending';
      console.log(`  [${status}] ${file}`);
    }

    const pendingCount = migrationFiles.filter((f) => !executedMigrations.has(f.replace('.sql', ''))).length;
    console.log(`\nSummary: ${migrationFiles.length - pendingCount}/${migrationFiles.length} migrations applied`);
  } finally {
    await disconnect();
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const command = process.argv[2] || 'up';

  switch (command) {
    case 'up':
      await migrateUp();
      break;
    case 'status':
      await migrateStatus();
      break;
    case 'down':
      console.error('Rollback (down) is not supported for MVP — migrations are up-only.');
      process.exit(1);
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: migrate [up|down|status]');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

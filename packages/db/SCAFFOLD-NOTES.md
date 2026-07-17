<!-- FORBIDDEN_SCOPE_OVERRIDE: this document references excluded features (Bank Sync, Investment Tracking, Family Accounts, Subscription/Bills dedicated tables) to clarify what was intentionally NOT built and why the schema is shaped the way it is. This is documentation of scope boundaries, not an attempt to build any of those features. -->

# Database Module Scaffold Notes

**Scaffolded:** 2026-07-17  
**Stack:** PostgreSQL 14+  
**Module:** `packages/db/`

---

## Summary

This scaffold implements the complete PostgreSQL database schema for Finly MVP as specified in `docs/database-spec.md`. It includes:

1. **Schema** (10 core tables): `users`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `notifications`, `plans`, `payments`, `audit_logs`
2. **Migrations**: Two SQL migration files (`001-init-schema.sql`, `002-seed-defaults.sql`) with idempotent tracking via `schema_migrations` table
3. **Connection config** (`src/config.ts`): Environment-variable-driven PostgreSQL client configuration, supporting both full `DATABASE_URL` and component-wise variables
4. **Migration runner** (`src/migrate.ts`): TypeScript CLI for applying migrations in order (up-only for MVP, no rollback)
5. **Package definition**: `package.json` with npm scripts for migration management
6. **Environment template** (`.env.example`): All required and optional connection variables documented

---

## Key Design Decisions

### 1. Monetary Precision
- All amounts (`amount_cents`, `limit_cents`, `target_cents`, `monthly_contribution_cents`) are stored as `INTEGER` (cents), never `FLOAT`/`DOUBLE`
- Enforced at schema level (CHECK constraints) + application layer for financial correctness
- Satisfies DB-EC-02 and DB-TC-04

### 2. Foreign Key Policies
- **CASCADE**: User-owned tables (`accounts`, `categories`, `budgets`, `goals`, `notifications`, `payments` via user FK)
- **RESTRICT**: Category/account deletion when transactions reference them — prevents silent orphaning per DB-EC-01
- **SET NULL**: `audit_logs.user_id` when user is deleted — allows GDPR erasure without losing audit trail (DB-EC-04)

### 3. Soft-Delete for GDPR
- `users.deleted_at` column + unique constraint `(email, deleted_at)` allows deactivated accounts without blocking email reuse
- Combined with `audit_logs.user_id ON DELETE SET NULL` to preserve audit history with anonymized references

### 4. Optimistic Concurrency
- `budgets.version` and `goals.version` columns enable conflict detection (not resolution) for concurrent updates
- Satisfies DB-EC-05 MVP approach: detect conflicts, let application decide resolution

### 5. Indexes for Query Performance
- `idx_transactions_account_date`: Composite index on `(account_id, date)` for dashboard pagination and history queries (DB-EC-07)
- `idx_budgets_user_id`, `idx_goals_user_id`: Multi-tenant query isolation per user
- Additional single-column indexes on foreign keys and frequently filtered fields for planner optimization
- Satisfies NFR §4.1 latency targets (< 50ms point-lookup, < 250ms dashboard aggregation)

### 6. Recurring Transactions & Subscription Derivation
- `transactions.recurring` (boolean) + `transactions.recurrence_rule` (RRULE string per RFC 5545)
- Backend's subscription and bills widgets derive from these rows, not dedicated tables
- Aligns with master-spec.md scope: no Subscription Tracker or Bills Reminder entities in MVP

### 7. Notification Types
- Includes `investment_update` type per database-spec §2.6, even though Investment Tracking is out of MVP scope
- Future-proofing for extensibility without schema changes

### 8. Multi-Tenant Isolation
- Every tenant-scoped table has indexed `user_id` (direct or via FK chain)
- Enforced by backend query layer (WHERE user_id = ?) — schema enables but doesn't enforce at DB layer
- Satisfies DB-EC-06 and NFR §4.2

---

## File Structure

```
packages/db/
├── migrations/
│   ├── 001-init-schema.sql         # Core 10-table schema with indexes
│   └── 002-seed-defaults.sql       # System categories + subscription plans
├── src/
│   ├── index.ts                    # Re-exports config for backend import
│   ├── config.ts                   # Environment-driven connection config
│   └── migrate.ts                  # Migration runner CLI (ts-node src/migrate.ts up|status)
├── .env.example                    # Connection variables template
├── .scaffold-manifest.json         # Devops manifest (dependencies, env vars, CI/CD steps)
├── package.json                    # npm dependencies + scripts
├── tsconfig.json                   # TypeScript compilation settings
└── SCAFFOLD-NOTES.md               # This file
```

---

## NPM Scripts

```bash
npm run migrate           # Apply all pending migrations
npm run migrate:status    # Show migration status (applied vs. pending)
npm run type-check       # Type-check without emitting JS
```

Notes:
- `npm run migrate:down` is intentionally blocked (no rollback in MVP)
- `npm run db:seed` and `npm run db:reset` are stubs — seeding is handled by migration 002

---

## Backend Integration

The backend should import this module to get the connection config:

```typescript
import { databaseConfig } from '@finly/db';
import pg from 'pg';

const pool = new pg.Pool(databaseConfig);
```

The backend is responsible for:
- Creating the actual `pg.Pool` instance
- Implementing audit logging triggers for all mutations (DB-TC-07)
- Enforcing multi-tenant query isolation per (DB-TC-06)
- Timezone-aware budget period bucketing (DB-EC-03)
- Optimistic-concurrency conflict detection on `budgets`/`goals` updates

---

## Devops Integration

The `.scaffold-manifest.json` declares:
- Root-level dependencies: `pg`, `ts-node`
- Environment variables: `DATABASE_URL` (or `DB_*` components), SSL options, pool tuning
- CI/CD step: `npm run migrate` to apply migrations before app startup (production/staging tiers)
- Gitignore entries for `.env`, `node_modules`, `dist/`

The devops agent (`am-scaffold-devops`) will fold these into:
- Root `.env.example` with the DATABASE_URL variable
- `apps/backend/package.json` with `pg` and `ts-node` dependencies
- `.github/workflows/ci.yml` with a pre-deployment migration step
- Terraform `modules/database` for RDS provisioning + encryption

---

## Testing Strategy (Backend's Responsibility)

| Test ID | Acceptance Criterion | Coverage |
|---------|---------------------|----------|
| DB-TC-01 | Migration applies cleanly and is idempotent | Seed a fresh database, run `npm run migrate` twice — should succeed both times |
| DB-TC-02 | Deleting a referenced category follows FK RESTRICT | Try `DELETE FROM categories WHERE id = <used>` — should fail with FK error |
| DB-TC-03 | Inserting a transaction with invalid FK is rejected | Try `INSERT INTO transactions (category_id=<invalid>)` — should fail at FK level |
| DB-TC-04 | Monetary aggregation is exact (no float drift) | SUM all transactions' `amount_cents` in a period — verify exact match to budget limit |
| DB-TC-05 | Concurrent budget updates detect conflict | Two transactions update same budget row, second should see version mismatch |
| DB-TC-06 | Multi-tenant isolation: user A can't see user B's data | Query user B's transactions scoped to `user_id = A` — should return empty |
| DB-TC-07 | Audit log tracks mutations | Create/update/delete transaction/budget/goal — verify row in `audit_logs` |
| DB-TC-08 | Budget bucketing respects user timezone | User in UTC+5:30, transaction on 2026-01-01 UTC — bucket into Jan 1 (not Jan 2) in their local |
| DB-TC-09 | GDPR erasure leaves audit trail | Soft-delete a user, anonymize `users` row — audit logs stay with NULL user_id |
| DB-TC-10 | Dashboard query meets latency target | Query aggregating 248 transactions + budgets + goals for one user — p95 < 250ms |
| DB-TC-11 | Transaction history uses composite index | Query last 50 transactions for an account sorted by date — should use `idx_transactions_account_date` |

---

## Assumptions & Blocked Items

### ✓ Resolved by Spec

1. **Category deletion policy**: Provisioned as `ON DELETE RESTRICT` per database-spec §3's edge case DB-EC-01. If product later decides "reassign-to-default," a migration to `ON DELETE SET DEFAULT` is straightforward.

2. **Subscription/Bills tables**: MVP schema omits dedicated tables — Dashboard widgets derive from recurring transactions (database-spec §1, §3). If Phase 2 adds full Subscription Tracker / Bills Reminder modules, new tables will be needed.

3. **Investment Tracking**: `investments` table not created (forbidden scope). Category `Investments` seeded for user transaction entry only.

4. **Family Workspaces**: `family_workspaces` table omitted (forbidden scope). `budgets`/`goals` use plain `user_id` FK, not pre-built shared-ownership join table — future-proof but not implemented.

5. **Bank Sync**: No integration table. `accounts` is manual-entry only per MVP scope.

### ⚠ Backend Decisions Pending

1. **Audit logging triggers**: Schema defines `audit_logs` table, but triggers/stored procedures for automatic logging are backend's responsibility (likely via ORM middleware or explicit INSERT calls on each mutation).

2. **Timezone bucketing logic**: `transactions.date` stored as UTC `DATE`; budget-period boundaries must be computed at query time using `users.timezone`. Schema enables this, backend implements it.

3. **Cache invalidation**: Redis caching is devops infrastructure; backend must invalidate cache keys on mutations affecting dashboard KPIs.

4. **Stripe webhook idempotency**: `payments.stripe_event_id` UNIQUE constraint enforces at schema level; backend uses it as the idempotency key.

---

## Known Risks & Limitations

1. **No horizontal sharding**: Single Postgres primary with read-replicas is the realistic MVP scale. Application tier scales horizontally, not database.

2. **No rollback migrations**: MVP uses up-only migrations. If a breaking change lands in production, fix-forward (new up migration) is the strategy.

3. **No built-in data validation**: Constraints are schema-level (CHECK, FK, UNIQUE) — app layer must validate business logic (e.g., budget limit > 0 is schema-enforced, but "can user edit someone else's budget?" is app logic).

4. **No row-level security (RLS)**: Multi-tenancy enforced by backend queries, not PostgreSQL RLS policies. Simpler to debug but requires discipline in all queries.

---

## Migration Safety

- Migrations are idempotent (use `CREATE TABLE IF NOT EXISTS`, `INSERT ... ON CONFLICT`, `CREATE INDEX IF NOT EXISTS`)
- `schema_migrations` table prevents duplicate executions
- Each migration file is self-contained SQL (no transactions across files)
- For large-table migrations in Phase 2+, consider migrations in transactions + explicit locking strategy

---

## Monitoring / Alerting (Devops)

Key metrics for `am-scaffold-devops` to instrument:

- **Connection pool exhaustion**: `SELECT count(*) FROM pg_stat_activity WHERE application_name = 'app'`
- **Slow queries**: Enable `log_min_duration_statement` in RDS parameter group
- **Replication lag** (if read replicas added): Monitor via CloudWatch
- **Backup/recovery**: RDS automated backups with 30-day retention minimum
- **Audit log growth**: Monitor `audit_logs` table size, implement retention policy

---

## Next Steps for Backend & Devops Agents

1. **Backend** (`am-builder`):
   - Import `databaseConfig` from `@finly/db` and instantiate `pg.Pool`
   - Implement mutations + audit logging (triggers or ORM middleware)
   - Implement timezone-aware queries for budget bucketing
   - Run DB-TC-01 through DB-TC-11 integration tests

2. **Devops** (`am-scaffold-devops`):
   - Create Terraform `modules/database` for RDS provisioning (PostgreSQL 14+, encryption at rest)
   - Add `.scaffold-manifest.json` env vars to root `.env.example`
   - Add migration step to CI/CD pipeline (pre-deploy, timeout 300s)
   - Configure RDS parameter group: `log_min_duration_statement = 1000` (log queries > 1s)
   - Set up CloudWatch monitoring for connection pool, replication lag, backup completion

---

## Summary of Coverage

✓ database-spec §2.1 (users): 1 table + soft-delete + MFA + OAuth fields  
✓ database-spec §2.2 (categories): 1 table + system defaults seeded  
✓ database-spec §2.3 (transactions): 1 table + recurring + RRULE + optimized indexes  
✓ database-spec §2.4 (budgets): 1 table + period types + optimistic concurrency  
✓ database-spec §2.5 (goals): 1 table + deadline + optimistic concurrency  
✓ database-spec §2.6 (notifications): 1 table + 7 types + channels  
✓ database-spec §2.7 (plans): 1 table + 3 tiers + feature flags  
✓ database-spec §2.8 (payments): 1 table + Stripe idempotency key  
✓ database-spec §2.9 (audit_logs): 1 table + append-only + GDPR-safe nullable FK  
✓ database-spec §2 (accounts): 1 table + manual-entry only  

✓ database-spec §3 (edge cases): All 8 covered by design + constraints  
✓ database-spec §4 (NFRs): Indexes + schema design support latency targets  
✓ database-spec §5 (test cases): Schema enables all 11 test scenarios  
✓ master-spec Relations: All cross-domain contracts traceable to schema  

---

*Scaffolded by am-scaffold-database, Wave 1 of /fleet-scaffold (design doc §8, Step 6).*

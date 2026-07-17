# database-spec.md

*Produced by /fleet-spec (Step 5), from the database section of PLAN.md. Same six fixed sections as every domain spec.*

<!-- FORBIDDEN_SCOPE_OVERRIDE: this spec documents Investment Tracking, Family Accounts, Debt Tracker, Subscription Tracker, and Bills Reminder as EXCLUDED (no dedicated tables in this MVP schema), consistent with master-spec.md — it does not build any of them. Referencing an excluded item to say "not built" is not a violation of that exclusion. -->

## 1. Scope & responsibilities

PostgreSQL. Scaffolded into `packages/db/` by `am-scaffold-database`. Owns the relational schema and migrations for all MVP modules: `users`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `notifications`, `plans`, `payments`, `audit_logs`. No `investments`, `family_workspaces`, `debts`, `subscriptions`, or `bills` tables in MVP — Subscriptions/Bills Dashboard widgets are served by a filtered/derived query over `transactions` (see `backend-spec.md §1`), not by dedicated tables.

## 2. Interfaces / contracts

Consumed exclusively through the backend's data-access layer — no direct frontend or external access. Cross-checked against `master-spec.md`'s Relations table.

- **§2.1 `users`**: `id`, `email` (unique), `password_hash` (nullable if OAuth-only), `oauth_provider`/`oauth_id` (nullable), `preferred_currency`, `country`, `timezone`, `role` (`user`/`family_admin`/`admin`/`super_admin`), `notification_prefs` (jsonb), `mfa_enabled`, `created_at`, `updated_at`, `deleted_at` (soft-delete for GDPR). Backs Relations rows "Auth: *" and "`GET/PATCH /users/me`".
- **§2.2 `categories`**: `id`, `user_id` (nullable — null = system default category), `name`, `icon`, `created_at`. Seeded with PRD §8's default category list (Food, Transportation, Shopping, Healthcare, Entertainment, Education, Bills, Travel, Insurance, Rent, Utilities, Investments, Miscellaneous).
- **§2.3 `transactions`**: `id`, `account_id` (FK), `category_id` (FK), `type` (`income`/`expense`), `amount_cents` (integer, never float), `date`, `notes`, `payment_method`, `recurring` (boolean), `recurrence_rule` (nullable, e.g. RRULE-style string, drives Subscriptions/Upcoming-Bills widget derivation per `backend-spec.md §1`), `created_at`, `updated_at`. Index: `(account_id, date)` for pagination/history performance; index on `(user_id, recurring, category_id)` to serve the widget-derivation queries efficiently.
- **§2.4 `budgets`**: `id`, `user_id` (FK), `category_id` (FK), `period_type` (`monthly`/`weekly`/`yearly`), `limit_cents`, `start_date`, `updated_at`/`version` (optimistic-concurrency column).
- **§2.5 `goals`**: `id`, `user_id` (FK), `name`, `target_cents`, `current_cents`, `deadline`, `monthly_contribution_cents`, `updated_at`/`version`.
- **§2.6 `notifications`**: `id`, `user_id` (FK), `type` (Budget Alert/Bill Due/Goal Progress/Weekly Summary/Monthly Summary/Low Balance/Investment Update), `channel` (`email`/`push`/`sms`), `payload` (jsonb), `sent_at`, `read_at`, `created_at`.
- **§2.7 `plans`**: `id`, `name` (`free`/`pro`/`family`), `stripe_price_id`, `feature_flags` (jsonb).
- **§2.8 `payments`**: `id`, `user_id` (FK), `plan_id` (FK), `stripe_event_id` (unique — idempotency key), `stripe_subscription_id`, `status`, `amount_cents`, `created_at`.
- **§2.9 `audit_logs`**: `id`, `user_id` (nullable — system-initiated actions), `action`, `entity_type`, `entity_id`, `diff` (jsonb), `created_at`. Append-only, no update/delete route ever targets this table.

`accounts`: `id`, `user_id` (FK), `name`, `type` (`cash`/`bank`/`card`), `created_at` — manual-entry only in MVP (no Bank Sync).

## 3. Edge cases

- DB-EC-01: Deleting a `category` referenced by existing `transactions`/`budgets` — FK policy (`ON DELETE RESTRICT` pending the reassign-vs-block product decision flagged in `backend-spec.md §6`) prevents silent orphaning either way.
- DB-EC-02: Monetary columns are `integer` (cents) or fixed-point `numeric`, never `float`/`double` — enforced at the schema level, not just app-layer convention.
- DB-EC-03: Timezone-aware bucketing for budget-period boundaries — `transactions.date` stored as UTC `timestamptz`; bucketing logic reads `users.timezone` at query time rather than assuming server-local time.
- DB-EC-04: GDPR soft-delete (`users.deleted_at`) vs. audit-log retention are in tension for the same user record — `audit_logs.user_id` is nullable so a user's PII can be scrubbed from `users` while the audit trail (referencing an anonymized/tombstoned user row) remains intact.
- DB-EC-05: Concurrent writes to the same `budgets`/`goals` row — `version`/`updated_at` column enables optimistic-concurrency detection at the query layer.
- DB-EC-06: Multi-tenant data isolation — every tenant-scoped table has an indexed `user_id` (directly, or via `account_id`/`category_id` FK chain for `transactions`), enforced by the backend's query layer, not solely by a column's existence.
- DB-EC-07: Large transaction history (thousands of rows per real user, vs. the mockup's seeded 248) — `(account_id, date)` index from the first migration, not added reactively after a slow-query report.
- DB-EC-08: Inserting a transaction with a non-existent `account_id`/`category_id` — rejected at the FK constraint level, not solely by app-layer validation (defense in depth).

## 4. Non-functional requirements

### 4.1 Latency Standards

- Point-lookup / simple CRUD queries: p95 < 50ms.
- Dashboard aggregation query (joins/sums across `transactions`+`budgets`+`goals` for one user): p95 < 250ms — feeds the backend's p95 < 500ms `GET /dashboard` budget with headroom for app-layer overhead.
- Report-generation queries (full-history date-range scans): no hard latency budget — served via the backend's async job (`backend-spec.md §2.7`), not a synchronous path.

### 4.2 Other NFRs

- Multi-tenant architecture: realistic interpretation at this layer is a single Postgres primary with read-replica/vertical scaling, not application-tier horizontal sharding — the app tier scales horizontally (`backend-spec.md §4.2`), not the database itself, for MVP.
- Encryption at rest: RDS-level encryption for staging/production (`devops-spec.md §2`'s database module); Dockerized Postgres for demo tier has no equivalent guarantee, acceptable since demo data is disposable/non-production.
- Redis cache sits in front of expensive aggregate queries; every mutating endpoint that affects a cached aggregate must invalidate the relevant cache key (ties to `backend-spec.md §2.3`).

## 5. Test cases

| ID | Acceptance criterion | Tier | Notes |
|---|---|---|---|
| DB-TC-01 | Migration applies cleanly on an empty database and is idempotent/re-runnable in dev | integration | — |
| DB-TC-02 | Deleting a referenced `category` follows the defined FK policy rather than erroring unhandled or orphaning rows | integration | Covers DB-EC-01 |
| DB-TC-03 | Inserting a transaction with a non-existent `account_id`/`category_id` is rejected at the FK constraint level | unit | Covers DB-EC-08 |
| DB-TC-04 | Sum of transactions for a budget period is exact to the cent across a large volume of rows (no float drift) | unit | Covers DB-EC-02 |
| DB-TC-05 | Two concurrent updates to the same `budget` row are both persisted with the second write's conflict detectable via `updated_at`/version mismatch | integration | Covers DB-EC-05 |
| DB-TC-06 | Multi-tenant query isolation: a query scoped to `user_id=A` never returns rows belonging to `user_id=B`, verified with seeded cross-tenant data | integration | Covers DB-EC-06 |
| DB-TC-07 | An `audit_logs` row is created for every mutating operation across at least Transactions, Budgets, Goals, and Billing | integration | Exercises Relations row "Audit logging" |
| DB-TC-08 | Budget-period aggregation buckets correctly across a user-timezone month/year boundary | unit | Covers DB-EC-03 |
| DB-TC-09 | Deleting/anonymizing a user's PII via the GDPR erasure path leaves the `audit_logs` trail intact with a nullable/tombstoned `user_id` reference | integration | Covers DB-EC-04 |
| DB-TC-10 | Dashboard aggregation query completes within p95 < 250ms against a seeded large-history dataset | e2e | Latency-linked |
| DB-TC-11 | Transaction-history query using the `(account_id, date)` index performs correctly against a seeded multi-thousand-row account | integration | Covers DB-EC-07 |

## 6. Open risks / assumptions

- Debts, Subscriptions, and Bills tables are not modeled in the MVP schema per the confirmed scope decision — Subscriptions/Bills widgets derive from `transactions.recurring`/`recurrence_rule` instead (see `backend-spec.md §1`, §6). If either becomes a full feature later (PRD §17 Phase 2+), expect a genuine new-table addition, not just a widget-query change.
- `family_workspaces` (PRD §14 lists it) is excluded from the MVP schema; `budgets`/`goals`' `user_id` ownership column is kept as a plain FK rather than pre-building a shared-ownership join table, since Family Accounts are out of scope and speculative schema for it isn't warranted yet.
- `investments` table excluded from MVP schema for the same reason (Investment Tracking is Forbidden Scope).
- Category-deletion FK policy (`RESTRICT` vs. reassign) is provisionally `RESTRICT` here pending the product decision flagged in `backend-spec.md §6` — may need a migration to `ON DELETE SET DEFAULT` once that's decided.

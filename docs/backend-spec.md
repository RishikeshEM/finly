# backend-spec.md

*Produced by /fleet-spec (Step 5), from the backend section of PLAN.md. Same six fixed sections as every domain spec.*

<!-- FORBIDDEN_SCOPE_OVERRIDE: this spec documents Bank Sync, AI Financial Assistant, OCR, Investment Tracking, Family Accounts, Tax Reports, Debt Tracker, Subscription Tracker, Bills Reminder, GraphQL, and multi-currency as EXCLUDED (Forbidden Scope items), consistent with master-spec.md — it does not build any of them. Referencing an excluded item to say "not built" is not a violation of that exclusion. -->

## 1. Scope & responsibilities

Node + Express + TypeScript, REST API under `/api/v1`, single monolithic service (`master-spec.md`'s Architecture decision). Scaffolded into `apps/backend/` by `am-scaffold-backend`. Owns: authentication (email/password, Google/Apple OAuth, OTP, MFA, password reset), all business logic and calculations (budget-status thresholds, savings-goal progress, cash-flow aggregation, dashboard KPI computation), category/transaction/budget/goal CRUD, reports generation (async PDF/CSV/Excel export jobs), notification dispatch (email/push/SMS trigger logic — delivery via Firebase Cloud Messaging + SendGrid), SaaS billing (Stripe integration, Free/Pro/Family plan-tier state), admin-panel API surface (user mgmt, subscription mgmt, revenue dashboard, audit logs — no frontend UI in this MVP per `frontend-spec.md §2.10`, but the API exists for ops/future use), and RBAC enforcement across the four PRD roles (User, Family Admin, Admin, Super Admin — Family Admin has no active workspace to administer in MVP since Family Accounts are excluded, but the role/permission scaffolding exists for when it lands).

**Dashboard-widget-only modules**: Subscriptions and Bills have no dedicated CRUD module, table, or route group. Their Dashboard widgets are served by a query over `transactions` filtered to `recurring = true` (optionally further filtered by category, e.g. a "Subscriptions" category for the Subscriptions widget, and next-due-date computed from the recurrence rule for the Upcoming Bills widget) — see `database-spec.md §2.3`. This is a design decision made here to support the confirmed widget-only scope without building unused entities; flagged as an assumption in §6, not silently invented.

## 2. Interfaces / contracts

Cross-checked against `master-spec.md`'s Relations table — section numbers below correspond 1:1 to that table's Backend ref column.

- **§2.1 Auth**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET/POST /api/v1/auth/oauth/{google,apple}/callback`, `POST /api/v1/auth/otp/{request,verify}`, `POST /api/v1/auth/password-reset/{request,confirm}`, `POST /api/v1/auth/refresh`. JWT access token (short-lived) + refresh token (httpOnly cookie). Writes `users` (`database-spec.md §2.1`).
- **§2.2 Profile**: `GET/PATCH /api/v1/users/me`. Reads/writes `users`.
- **§2.3 Dashboard**: `GET /api/v1/dashboard` — single aggregated response (KPIs, cash flow, budget/goal summaries, recent transactions, upcoming bills, subscriptions), cached in Redis with invalidation on any write to `transactions`/`budgets`/`goals` for that user. Reads `transactions`, `budgets`, `goals`, `categories` (`database-spec.md §2.2–§2.5`).
- **§2.4 Transactions/Categories**: `GET/POST/PATCH/DELETE /api/v1/transactions`, `GET/POST /api/v1/categories`. Amounts transported as integer minor-units (cents), never floating point. Writes `transactions`, `categories`.
- **§2.5 Budgets**: `GET/POST/PATCH/DELETE /api/v1/budgets`. Writes `budgets`.
- **§2.6 Goals**: `GET/POST/PATCH/DELETE /api/v1/goals`. Writes `goals`.
- **§2.7 Reports**: `GET /api/v1/reports` (on-the-fly aggregates), `POST /api/v1/reports/export` (enqueues an async job; returns a job ID; client polls `GET /api/v1/reports/export/{jobId}`). Reads `transactions` aggregates.
- **§2.8 Notifications**: `GET /api/v1/notifications`, plus internal trigger logic (Budget Alert, Bill Due, Goal Progress, Weekly/Monthly Summary, Low Balance) run as queue-worker jobs. Writes `notifications`.
- **§2.9 Billing**: `POST /api/v1/billing/checkout`, `POST /api/v1/billing/portal`, `POST /api/v1/billing/webhook` (Stripe webhook, idempotent on `event.id`). Writes `plans`, `payments`.
- **§2.10 Admin**: `GET /api/v1/admin/users`, `GET /api/v1/admin/subscriptions`, `GET /api/v1/admin/revenue`, `GET /api/v1/admin/audit-logs`, `GET/POST /api/v1/admin/feature-flags`. Reads across most tables; writes `audit_logs` is cross-cutting (every mutating endpoint above writes an audit-log row, not just this module).

## 3. Edge cases

- BE-EC-01: Duplicate transaction submission (double-click / client retry) — idempotent via a client-supplied idempotency key, not double-counted.
- BE-EC-02: Concurrent budget/goal update from two devices — `updated_at`/version check detects the conflict (MVP: detect, not auto-resolve).
- BE-EC-03: Stripe webhook arrives out of order or is retried — idempotent on `event.id`, no double-application of a plan change.
- BE-EC-04: Password-reset token reuse or expiry — rejected with a clear, generic error (no user-enumeration leak).
- BE-EC-05: OTP code expiry, max-attempt lockout, and resend rate-limiting.
- BE-EC-06: Mixed-currency input — rejected/ignored per-account (single `Preferred Currency`, no conversion logic in MVP) rather than silently mis-summing.
- BE-EC-07: Deleting a `category` referenced by existing `transactions`/`budgets` — policy decision needed (reassign to a default category vs. block deletion); flagged in §6, not assumed.
- BE-EC-08: Budget period boundaries (monthly/weekly/yearly) crossing a calendar-month/year edge — bucketed by the user's stored timezone, not server UTC.
- BE-EC-09: Auth endpoint abuse (login attempts, OTP requests) — rate-limited per PRD §12 security posture.
- BE-EC-10: GDPR data-export / right-to-erasure request — `GET /api/v1/users/me/export`, `DELETE /api/v1/users/me` (soft-delete PII, retain anonymized audit-log entries per §6's soft/hard-delete tension).

## 4. Non-functional requirements

### 4.1 Latency Standards

- CRUD/read endpoints: p50 < 120ms, p95 < 300ms (PRD §12 hard requirement), p99 < 800ms.
- `GET /api/v1/dashboard` (heavier aggregate): p95 < 500ms.
- Report export jobs: no synchronous latency budget — async queue job with a polling/webhook completion signal.

### 4.2 Other NFRs

- Multi-tenant architecture: every tenant-scoped query enforces `user_id` scoping at the query-builder/ORM layer, not left to per-route discipline.
- Horizontal scaling: stateless app tier behind a load balancer (session state lives in JWT + Redis, not in-process).
- Redis cache in front of the dashboard aggregation and reports endpoints; queue workers (BullMQ or equivalent) for report generation and notification dispatch.
- Security: encryption in transit (HTTPS/TLS everywhere), RBAC enforced per-route via middleware, audit logging is cross-cutting (every mutating endpoint), SOC 2 readiness posture (least-privilege service credentials, structured audit trail).
- 99.9% uptime SLA — implies health-checked auto-recovery compute (see `devops-spec.md §4.2`).

## 5. Test cases

| ID | Acceptance criterion | Tier | Notes |
|---|---|---|---|
| BE-TC-01 | Register via email/password; password is hashed, never stored or returned in plaintext | unit | Exercises Relations row "Auth: register / login" |
| BE-TC-02 | Login via Google/Apple OAuth creates or links the correct user record | integration | Exercises Relations row "Auth: OAuth" |
| BE-TC-03 | OTP + MFA challenge blocks login until satisfied; lockout triggers after max attempts | integration | Covers BE-EC-05 |
| BE-TC-04 | JWT refresh flow issues a new access token without re-login; rejects an expired/revoked refresh token | integration | — |
| BE-TC-05 | Duplicate transaction submission with the same idempotency key is not double-counted | integration | Covers BE-EC-01 |
| BE-TC-06 | Create/update/delete a transaction; dashboard aggregation reflects it correctly and cache is invalidated | integration | Exercises Relations row "GET /dashboard" and "transactions" |
| BE-TC-07 | Budget status thresholds compute correctly at exactly 85% (near-limit) and exactly 100% (over-budget) boundaries | unit | Exercises Relations row "budgets" |
| BE-TC-08 | Savings goal progress percentage computes correctly, including >100% (goal exceeded) | unit | Exercises Relations row "goals" |
| BE-TC-09 | Stripe webhook for subscription upgrade/downgrade updates plan tier correctly; duplicate delivery of the same `event.id` is a no-op | integration | Covers BE-EC-03; exercises Relations row "Billing" |
| BE-TC-10 | Rate limiting blocks further attempts after N failed login/OTP requests | integration | Covers BE-EC-09 |
| BE-TC-11 | Report export job (CSV/PDF/Excel) completes and totals match the underlying transaction data | integration | Exercises Relations row "reports/export" |
| BE-TC-12 | RBAC: a `User` role cannot access `/api/v1/admin/*`; cross-tenant data access is rejected | integration | Exercises Relations row "Admin" |
| BE-TC-13 | GDPR export/delete-account endpoints return a complete data snapshot / remove PII respectively, retaining anonymized audit entries | integration | Covers BE-EC-10 |
| BE-TC-14 | Deleting a `category` referenced by transactions/budgets follows the defined policy (reassign or reject), not an unhandled error | integration | Covers BE-EC-07 |
| BE-TC-15 | Budget-period aggregation buckets correctly across a user-timezone month/year boundary, not server UTC | unit | Covers BE-EC-08 |
| BE-TC-16 | Mixed-currency transaction input is rejected/ignored rather than mis-summed | unit | Covers BE-EC-06 |
| BE-TC-17 | Concurrent updates to the same budget/goal are both persisted with the second write's conflict detectable via version/`updated_at` mismatch | integration | Covers BE-EC-02 |
| BE-TC-18 | `GET /api/v1/dashboard` responds within p95 < 500ms under a seeded-data load test | e2e | Latency-linked |
| BE-TC-19 | CRUD/read endpoints respond within p95 < 300ms under a seeded-data load test | e2e | Latency-linked |
| BE-TC-20 | An `audit_logs` row is created for every mutating operation across Transactions, Budgets, Goals, and Billing | integration | Cross-cutting; exercises Relations row "Audit logging" |

## 6. Open risks / assumptions

- Deleting a referenced `category`: reassign-to-default vs. block-deletion policy not yet decided by product — needs a decision before `am-scaffold-backend` implements the delete route (BE-EC-07).
- NestJS was the PRD's named framework; `node-express` was chosen instead (no NestJS template exists — see `PLAN.md` Stack decision). A manual module/folder convention should be enforced during scaffold to avoid drift across multiple builders touching this API surface, since `node-express` has less built-in structural opinionation than NestJS would have provided.
- Subscriptions/Bills-widget derivation from `transactions.recurring` (§1) is this spec's own design decision to satisfy the confirmed widget-only scope — not something the PRD or mockup specified explicitly. Worth revisiting if/when Subscriptions or Bills become full features (PRD §17 Phase 2+).
- GDPR soft-delete (retain anonymized audit trail) vs. hard-delete (full PII removal) are in tension for the same record — the export/delete implementation in BE-EC-10 assumes anonymization satisfies both; worth a compliance/legal sanity check before this ships to real users, not just an engineering assumption.

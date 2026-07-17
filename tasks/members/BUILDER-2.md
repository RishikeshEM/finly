# tasks/members/BUILDER-2.md

<!-- FORBIDDEN_SCOPE_OVERRIDE: this file documents that Investment Tracking, Bank Sync, and Family Accounts are explicitly NOT built by any task below (Forbidden Scope items referenced to confirm exclusion, not violated). "Family Admin" role scaffolding is a permission-scope stub only, per backend-spec.md §1 — no Family Accounts feature is implemented. -->

*One per person, produced by /fleet-tasks. Lists only this role's assigned tasks with full detail.*

## Assigned tasks

### BE-01 — Auth module (register, OAuth, OTP, MFA, reset, JWT refresh)

- **Domain:** backend
- **Spec section:** backend-spec.md §2.1
- **Complexity:** L
- **Risk:** High
- **Depends on:** DB-01
- **Branch:** `feat/builder-2/BE-01-auth-module-register-oauth-otp-mfa-reset-refresh`

High-fanout task: `BUILDER-1`'s `FE-02` (a different role) and your own `BE-02`/`BE-10` all depend on this — build and merge this first, as its own small early cluster, not batched behind your other backend work. Covers BE-EC-04 (reset-token reuse/expiry), BE-EC-05 (OTP expiry/lockout/rate-limit), BE-EC-09 (auth-endpoint abuse rate limiting).

### BE-02 — User profile endpoints

- **Domain:** backend
- **Spec section:** backend-spec.md §2.2
- **Complexity:** S
- **Risk:** Low
- **Depends on:** BE-01
- **Branch:** `feat/builder-2/BE-02-user-profile-endpoints`

`GET/PATCH /api/v1/users/me` — currency/country/timezone/notification-prefs fields. `BUILDER-1`'s `FE-09` depends on this.

### BE-03 — Transactions and categories CRUD

- **Domain:** backend
- **Spec section:** backend-spec.md §2.4
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DB-02, DB-06
- **Branch:** `feat/builder-2/BE-03-transactions-and-categories-crud`

Covers BE-EC-01 (idempotency key for duplicate submission), BE-EC-06 (reject mixed-currency input), BE-EC-07 (category-deletion FK policy — needs a product decision, flagged in backend-spec.md §6, don't assume one silently). Amounts as integer minor-units (cents), never floating point.

### BE-04 — Budgets CRUD and status computation

- **Domain:** backend
- **Spec section:** backend-spec.md §2.5
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DB-03
- **Branch:** `feat/builder-2/BE-04-budgets-crud-and-status-computation`

Covers BE-EC-02 (concurrent-update conflict detection via version column), BE-EC-08 (timezone-aware period-boundary bucketing). Status thresholds: on-track / near-limit (≥85%) / over-budget (≥100%).

### BE-05 — Goals CRUD and progress computation

- **Domain:** backend
- **Spec section:** backend-spec.md §2.6
- **Complexity:** S
- **Risk:** Low
- **Depends on:** DB-03
- **Branch:** `feat/builder-2/BE-05-goals-crud-and-progress-computation`

Progress percentage must compute correctly above 100% (goal exceeded), not clip or error.

### BE-06 — Dashboard aggregation endpoint and Redis cache

- **Domain:** backend
- **Spec section:** backend-spec.md §2.3
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** BE-03, BE-04, BE-05
- **Branch:** `feat/builder-2/BE-06-dashboard-aggregation-endpoint-and-redis-cache`

Single aggregated response — no per-widget waterfall. Redis-cached with invalidation on any write to `transactions`/`budgets`/`goals` for that user. p95 < 500ms target. `BUILDER-1`'s `FE-04` depends on this.

### BE-07 — Reports generation and async export jobs

- **Domain:** backend
- **Spec section:** backend-spec.md §2.7
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** BE-03
- **Branch:** `feat/builder-2/BE-07-reports-generation-and-async-export-jobs`

`POST /reports/export` enqueues a job (PDF/CSV/Excel); client polls for completion — no synchronous export given the 300ms endpoint budget. Verify export totals match underlying transaction data exactly.

### BE-08 — Notification dispatch queue workers

- **Domain:** backend
- **Spec section:** backend-spec.md §2.8
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DB-04
- **Branch:** `feat/builder-2/BE-08-notification-dispatch-queue-workers`

Trigger types: Budget Alert, Bill Due, Goal Progress, Weekly/Monthly Summary, Low Balance. Delivery via Firebase Cloud Messaging + SendGrid (`TECH-LEAD`'s `DO-03` provisions those secrets).

### BE-09 — Billing and Stripe integration

- **Domain:** backend
- **Spec section:** backend-spec.md §2.9
- **Complexity:** L
- **Risk:** High
- **Depends on:** DB-04
- **Branch:** `feat/builder-2/BE-09-billing-and-stripe-integration`

Covers BE-EC-03 (webhook idempotency on `event.id` — Stripe's at-least-once delivery means retries and out-of-order arrival are expected, not edge cases). Stripe is the system of record for plan tier, never a client-set field.

### BE-10 — Admin API and RBAC enforcement

- **Domain:** backend
- **Spec section:** backend-spec.md §2.10
- **Complexity:** M
- **Risk:** High
- **Depends on:** BE-01, DB-05
- **Branch:** `feat/builder-2/BE-10-admin-api-and-rbac-enforcement`

RBAC across all four PRD roles (User, Family Admin, Admin, Super Admin) — Family Admin has no active feature to administer yet (Family Accounts excluded from MVP), but its permission scope should still exist for when it lands. Every mutating endpoint across your other tasks writes an `audit_logs` row — that's a cross-cutting concern of this task, not something to re-derive per endpoint ad hoc.

## Build reminders

- Build in-context by default (design doc §1) — `am-builder` as a subagent is opt-in, only worth it when fanning out several independent tasks at once.
- Test in-context for S-complexity/Low-risk tasks (`BE-02`, `BE-05`); escalate to `am-tester` (isolated subagent) for M/L-complexity or Medium/High-risk tasks (everything else on this list).
- `am-code-reviewer` always runs as a subagent before pushing — unconditionally.
- `main` is protected — never push directly; open an MR from your feature branch.
- `dependency_gate.py` blocks branch creation if a declared dependency isn't yet on `origin/main` — this applies across roles too. `BE-01` in particular gates `BUILDER-1`'s `FE-02`; merge it promptly rather than letting it sit alongside unrelated work.

# tasks/members/BUILDER-3.md

<!-- FORBIDDEN_SCOPE_OVERRIDE: "Investments" appears below only as one of PRD §8's default expense-category names to seed (a category label), not the excluded Investment Tracking feature. -->

*One per person, produced by /fleet-tasks. Lists only this role's assigned tasks with full detail.*

## Assigned tasks

### DB-01 — Users, accounts, categories schema and migrations

- **Domain:** database
- **Spec section:** database-spec.md §2.1
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** —
- **Branch:** `feat/builder-3/DB-01-users-accounts-categories-schema-and-migrations`

High-fanout task: `BE-01` (a different role, BUILDER-2) depends on this — build and merge this first, don't batch it behind your other database work.

### DB-02 — Transactions table and history indexes

- **Domain:** database
- **Spec section:** database-spec.md §2.3
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DB-01
- **Branch:** `feat/builder-3/DB-02-transactions-table-and-history-indexes`

Covers DB-EC-02 (fixed-point money, never float), DB-EC-07 (`(account_id, date)` index from day one), DB-EC-08 (FK constraint on `account_id`/`category_id`).

### DB-03 — Budgets and goals tables with optimistic concurrency

- **Domain:** database
- **Spec section:** database-spec.md §2.4, §2.5
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DB-01
- **Branch:** `feat/builder-3/DB-03-budgets-and-goals-tables-with-optimistic-concurrency`

Covers DB-EC-05 (`version`/`updated_at` column for concurrent-write detection).

### DB-04 — Notifications, plans, payments tables

- **Domain:** database
- **Spec section:** database-spec.md §2.6, §2.7, §2.8
- **Complexity:** S
- **Risk:** Low
- **Depends on:** DB-01
- **Branch:** `feat/builder-3/DB-04-notifications-plans-payments-tables`

`payments.stripe_event_id` must be unique — it's the idempotency key `BE-09` relies on.

### DB-05 — Audit logs table (append-only)

- **Domain:** database
- **Spec section:** database-spec.md §2.9
- **Complexity:** S
- **Risk:** Medium
- **Depends on:** DB-01
- **Branch:** `feat/builder-3/DB-05-audit-logs-table-append-only`

No update/delete route should ever target this table. `audit_logs.user_id` is nullable to support DB-EC-04 (GDPR erasure vs. audit-retention tension). Two other roles (`BUILDER-2`'s `BE-10`, `TECH-LEAD`'s `DO-05`) depend on this — worth prioritizing alongside DB-01 rather than leaving for last.

### DB-06 — Seed default categories

- **Domain:** database
- **Spec section:** database-spec.md §2.2
- **Complexity:** S
- **Risk:** Low
- **Depends on:** DB-01
- **Branch:** `feat/builder-3/DB-06-seed-default-categories`

Seed with PRD §8's default category list (Food, Transportation, Shopping, Healthcare, Entertainment, Education, Bills, Travel, Insurance, Rent, Utilities, "Investments" as a category label, Miscellaneous) as `user_id = null` system-default rows.

## Build reminders

- Build in-context by default (design doc §1) — `am-builder` as a subagent is opt-in, only worth it when fanning out several independent tasks at once.
- Test in-context for S-complexity/Low-risk tasks (`DB-04`, `DB-06`); escalate to `am-tester` (isolated subagent) for M/L-complexity or Medium/High-risk tasks (`DB-01`, `DB-02`, `DB-03`, `DB-05`).
- `am-code-reviewer` always runs as a subagent before pushing — unconditionally.
- `main` is protected — never push directly; open an MR from your feature branch.
- If a task's `Depends on` is non-empty, `dependency_gate.py` checks `origin/main` for that dependency at branch-creation time and blocks if it isn't there yet. All your own tasks depend only on `DB-01`, which you own — no cross-role blocking on your side, but `BUILDER-2` and `TECH-LEAD` are waiting on `DB-01`/`DB-05` respectively.

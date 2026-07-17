# master-spec.md

<!-- FORBIDDEN_SCOPE_OVERRIDE: this is the file that DEFINES the Forbidden Scope items below — any edit to this file necessarily contains their text (e.g. "Bank Sync", "Investment Tracking"). That is the source of truth being authored, not a violation of it. Keep this marker present on every future edit to this file. -->

*Produced by `/fleet-spec` (Step 5). The cross-domain contract — every domain spec cross-checks its Interfaces section against this file's Relations table as it's written.*

**Project:** Finly — Personal Finance Tracker SaaS. Refined from `docs/PLAN.md`. MVP scope locked in via a checkpoint with the project owner on 2026-07-17 (Debt Tracker excluded; Subscription Tracker and Bills Reminder are Dashboard-widget-only, derived from recurring `transactions` rows rather than dedicated modules/tables — see Backend/Database specs §1, §2).

## Relations

*Traceability table — one row per cross-domain contract.*

| Contract | Frontend ref | Backend ref | Database ref | Devops ref |
|---|---|---|---|---|
| Auth: register / login (email+password) | frontend-spec §2.1 | backend-spec §2.1 | database-spec §2.1 (`users`) | devops-spec §2 (secrets: JWT signing key) |
| Auth: OAuth (Google/Apple) | frontend-spec §2.1 | backend-spec §2.1 | database-spec §2.1 (`users`) | devops-spec §2 (secrets: OAuth client secrets) |
| Auth: OTP / MFA | frontend-spec §2.1 | backend-spec §2.1 | database-spec §2.1 (`users`) | devops-spec §2 (secrets: SMS/email provider keys) |
| Auth: password reset | frontend-spec §2.1 | backend-spec §2.1 | database-spec §2.1 (`users`) | — |
| `GET/PATCH /users/me` (profile: currency/country/timezone/notification prefs) | frontend-spec §2.2 | backend-spec §2.2 | database-spec §2.1 (`users`) | — |
| `GET /dashboard` (aggregated KPIs, cash flow, budget/goal summaries, recent transactions, upcoming bills, subscriptions) | frontend-spec §2.3 | backend-spec §2.3 | database-spec §2.2, §2.3, §2.4, §2.5 (aggregate query) | devops-spec §2 (Redis cache) |
| `GET/POST/PATCH/DELETE /transactions` | frontend-spec §2.4 | backend-spec §2.4 | database-spec §2.3 (`transactions`) | — |
| `GET/POST /categories` | frontend-spec §2.4 | backend-spec §2.4 | database-spec §2.2 (`categories`) | — |
| `GET/POST/PATCH/DELETE /budgets` | frontend-spec §2.5 | backend-spec §2.5 | database-spec §2.4 (`budgets`) | — |
| `GET/POST/PATCH/DELETE /goals` | frontend-spec §2.6 | backend-spec §2.6 | database-spec §2.5 (`goals`) | — |
| `GET /reports`, `POST /reports/export` (PDF/CSV/Excel, async job) | frontend-spec §2.7 | backend-spec §2.7 | database-spec §2.3 (aggregate over `transactions`) | devops-spec §2 (queue workers) |
| `GET /notifications`, delivery triggers (Budget Alert, Bill Due, Goal Progress, Weekly/Monthly Summary, Low Balance) | frontend-spec §2.8 | backend-spec §2.8 | database-spec §2.6 (`notifications`) | devops-spec §2 (FCM/SendGrid secrets, queue workers) |
| `POST /billing/*`, Stripe webhook (`plans`/`payments`, subscription tier state) | frontend-spec §2.9 | backend-spec §2.9 | database-spec §2.7, §2.8 (`plans`, `payments`) | devops-spec §2 (Stripe secrets) |
| `GET/* /admin/*` (user mgmt, subscription mgmt, revenue dashboard, support tickets, feature flags, audit logs) | frontend-spec §2.10 (post-MVP UI, API scoped now) | backend-spec §2.10 | database-spec §2.9 (`audit_logs`) | — |
| Audit logging (cross-cutting, every mutating endpoint) | — | backend-spec §4.2 | database-spec §2.9 (`audit_logs`) | devops-spec §4.2 (retention) |
| Static asset delivery / CDN | frontend-spec §1 | — | — | devops-spec §2 |
| CI/CD build, test, deploy pipeline | frontend-spec §1 (build step) | backend-spec §1 (build step) | database-spec §1 (migration step) | devops-spec §2 |
| Demo-tier deploy/teardown (`/fleet-demo`) | — | — | — | devops-spec §7 |

## Forbidden Scope

<!-- Locked in via project-owner checkpoint, 2026-07-17. -->

- No Bank Sync / Open Banking (Plaid) integration in this MVP.
- No AI Financial Assistant (spending analysis, natural-language queries, financial health score) in this MVP.
- No OCR receipt scanning in this MVP.
- No Investment Tracking (stocks, ETFs, crypto, real estate, etc.) in this MVP.
- No Family Accounts / shared workspaces (multi-user shared budgets/goals/reports) in this MVP.
- No Tax Reports / tax estimation in this MVP.
- No Debt Tracker (credit cards, personal loans, mortgage, EMI) in this MVP — omitted from both the PRD's MVP-included and MVP-excluded lists and absent from the design mockup; project owner confirmed exclusion.
- No dedicated Subscription Tracker or Bills Reminder pages/CRUD modules in this MVP — the Dashboard's Subscriptions and Upcoming Bills widgets ship, derived from recurring `transactions` rows, but no standalone subscription/bill entity, renewal-reminder logic, or price-increase-alert logic. Project owner confirmed this scope.
- No multi-currency support — one `Preferred Currency` per user account; no currency-conversion logic.
- No GraphQL API — REST only for MVP (PRD lists GraphQL as "optional"; treated as not-built).
- No mobile app (Flutter/React Native) in this repo — web app only; mobile is an entirely separate future effort.
- No Kubernetes/EKS for staging or production compute in MVP — ECS/Fargate per the `aws` cloud stack template's default tier, despite the PRD's infrastructure list naming Kubernetes generally.
- Single-region deployment only; no multi-region failover in MVP (PRD's 99.9% uptime SLA does not require multi-region).

## Change Requests

| CR ID | Summary | Type | Status | Decision |
|---|---|---|---|---|

*No change requests raised yet.*

## Architecture decision

**Monolith.** A single Node/Express service (`apps/backend/`) owning all MVP modules (auth, users, dashboard, transactions, categories, budgets, goals, reports, notifications, billing, admin), backed by one PostgreSQL database. Rationale: 4-month MVP timeline (PRD §3), no stated traffic profile that would demand independent service scaling yet, and a monolith keeps the audit-logging/RBAC cross-cutting concerns (PRD §12) enforceable in one place rather than re-implemented per service. Async work (report generation, notification dispatch) runs as queue-worker jobs within the same deployable, not separate microservices. Revisit only if a specific module's load profile genuinely diverges (e.g. report generation under heavy concurrent export load) — not a default assumption for MVP.

## Git host

**GitHub.** PRD §13 explicitly names GitHub Actions (not GitLab CI) under Infrastructure — `am-scaffold-devops` emits `.github/workflows/ci.yml`.

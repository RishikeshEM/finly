# PLAN.md

*Produced by `/fleet-plan` (Step 4). One file, four domain sections, drafted in-context by the `spec-authoring` skill. Refined into `master-spec.md` + domain specs at `/fleet-spec`.*

**Project:** Finly — Personal Finance Tracker SaaS (individuals, families, freelancers, small business owners). MVP target: 4 months. Source: `inputs/raw/project-requirements.md` (PRD v1.0), `inputs/design/Finance Tracker.dc.html` (high-fidelity dashboard mockup, dark/light themed, no `tokens.json` present yet).

## Stack decision

| Layer | Chosen | Rejected alternatives (and why) |
|---|---|---|
| Frontend | `nextjs` | `react-vite` — no SSR/SEO, a real gap for a public marketing/landing surface; fastest dev iteration but not what PRD §13 asks for. `remix` — smaller ecosystem, SSR via a different convention set, not requested. |
| Backend | `node-express` | `python-fastapi` — stronger for ML/data-heavy work and typed auto-schema, but PRD §13 asks for NestJS/TypeScript/REST (no NestJS template exists; `node-express` is the closest TS match) and the AI Assistant that would justify Python is explicitly MVP-excluded (PRD §16). `go-fiber` — best throughput/latency, but that isn't the stated bottleneck for a CRUD-heavy 4-month MVP; smaller hiring pool. |
| Database | `postgres` | `mongo` — weaker cross-entity integrity, a real risk for ledger-style financial data (transactions must reference valid accounts/categories/budgets). `dynamodb` — AWS lock-in, requires access patterns fixed up front, poor fit for the ad-hoc reporting PRD §8 "Reports & Analytics" needs. |
| Cloud | `aws` | `gcp`/`azure` — not mentioned anywhere in the PRD; PRD §13 explicitly names AWS, S3, Docker, Kubernetes, GitHub Actions, Terraform. |
| Demo target | `aws-docker` | `railway` — recurring ~$5/mo floor and experimental IaC; `aws-docker` gives genuine $0 idle cost via `terraform destroy` between pitches, directly addressing PRD §19's "High infrastructure costs" risk, and keeps demo/staging/production on one platform. |

*All four layers plus demo target were surfaced to the user as a soft confirmation checkpoint and accepted as-is (no overrides).*

---

## Frontend

### Scope & responsibilities

Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui + React Query, per PRD §13. Owns: public marketing/login surface, authenticated dashboard app (sidebar + topbar shell), all data-entry forms (income, expense, budget, goal, debt), all data-visualization surfaces (KPI cards, cash-flow area chart, category donut, budget progress bars, savings-goal progress rings, monthly bar chart, trend line charts, net-worth chart), client-side auth/session handling, theme (light/dark) toggle and persistence, and the notification bell/toast surface. Owns no business logic beyond form validation and derived display formatting — all calculations (budget status, goal progress %, cash flow totals) are computed backend-side and delivered ready-to-render, since multiple clients (web + future mobile, PRD §13) must agree on the numbers.

**MVP page inventory** (from PRD §16 Included + design mockup `inputs/design/Finance Tracker.dc.html`, which is the de facto layout/component spec pending a formal `tokens.json`):
- Login (split-panel, email/password + Google/Apple OAuth buttons, "remember me", forgot-password link)
- Dashboard (5 KPI cards: Total Balance, Monthly Income, Monthly Expenses, Savings, Net Worth; cash-flow area chart; category-breakdown donut; budget-progress bars; savings-goal rings; recent-transactions list; upcoming-bills widget; subscriptions widget)
- Transactions (searchable/filterable full table, pagination, export button, quick-add)
- Budgets (overall summary donut + on-track/near-limit/over-budget counts; per-category budget cards; create-budget affordance)
- Savings Goals (summary tiles; per-goal cards with progress ring, deadline, monthly contribution, "add funds")
- Reports & Analytics (monthly-spending bar chart, income-trend line chart, category breakdown, budget-performance bars, net-worth trend; PDF/CSV/Excel export buttons)
- Settings, Profile (PRD §8 lists these as core features — user profile, currency/country/timezone, notification preferences — but the mockup only stubs them as "coming soon" placeholders; **real designs still needed**, see Open risks)

**Explicitly deferred to placeholder ("coming soon") screens for MVP**, matching PRD §16's exclusions: Investments, AI Financial Assistant. The mockup *also* stubs Subscriptions and Bills as full-page placeholders even though PRD §16 doesn't explicitly exclude them — see Open risks below; only the Dashboard's summary widgets for these are fully designed and in MVP scope.

Sidebar nav ships all 11 items (Dashboard, Transactions, Budgets, Savings Goals, Investments, Subscriptions, Bills, Reports, AI Assistant, Settings, Profile) from day one per the mockup, with non-MVP items routing to the placeholder screen rather than being hidden — preserves the roadmap story (PRD §17) without hiding nav structure.

### Interfaces / contracts

- Consumes REST endpoints under `/api/v1/*` from the backend (see Backend § Interfaces) via React Query; no direct DB access.
- Auth: JWT access token (short-lived) + refresh token (httpOnly cookie), OAuth redirect flow for Google/Apple, OTP flow for passwordless/MFA (PRD §8 Authentication).
- Theme/token contract: no `inputs/design/tokens.json` exists yet — `frontend-design` at scaffold time must derive an initial `tokens.json` from the mockup's inline color/spacing/typography values (documented in Non-functional requirements below) since `design_token_guard.py` will block raw hex/spacing literals in `apps/frontend/` regardless.

### Edge cases

- Empty states: zero transactions, zero budgets, zero goals (first-run user) — dashboard must render meaningfully empty, not a broken chart with no data.
- Session expiry mid-form-entry (e.g. filling a long expense form when the access token expires) — must refresh silently or preserve form state through a re-login.
- Currency formatting for non-USD `Preferred Currency` (PRD §8 User Profile) — locale-aware number/currency formatting, not hardcoded `$`.
- Budget/goal progress bars at >100% (overspent budget, goal exceeded) — bar and percentage must not visually break or read as invalid.
- Very long transaction descriptions / category names overflowing fixed-width table columns and cards.
- Concurrent edits: two tabs/devices editing the same budget or transaction — last-write-wins is acceptable for MVP but the UI must not silently show stale data after a background refetch conflict.
- Network failure mid quick-add (optimistic UI update must roll back cleanly on API error).
- Theme toggle persistence across sessions and across the login/app boundary (mockup's `toggleTheme` exists on both login and app shells).
- Pagination edge: last page with a partial row count, deep-linking to a page number beyond total pages.
- OAuth login where the provider email doesn't match an existing account vs. already-registered email under a different provider.

### Non-functional requirements

- Design-token candidates extracted from the mockup (to seed `tokens.json` at scaffold time): color roles `bg/sidebarBg/card/cardAlt/border/text/textMuted/textFaint/hoverBg/inputBg` (light + dark values), semantic colors `primary #10B981` (success/positive), `secondary #3B82F6` (brand/primary action), `accent #8B5CF6`, `warning #F59E0B`, `danger #EF4444`, each with a "soft" 10–20%-opacity variant for badges/icon backgrounds; typography `Inter` 400–800; radii 8–16px; card shadow (distinct light/dark values). Must be confirmed/formalized with the client before scaffold, not silently assumed final.
- Accessibility: WCAG 2.1 AA is checked unconditionally on e2e tests by `am-qa-runner` regardless of what this spec says — component contrast ratios (especially `textFaint` on `card`) should be sanity-checked against that bar now rather than failing QA later.

#### Latency Standards

- Dashboard load (PRD §12): p95 < 2s including first KPI paint; draft target p50 < 800ms, p99 < 3.5s.
- Route transitions between sidebar sections: p95 < 300ms (client-side nav, data may still be loading behind a skeleton).
- Quick-add optimistic UI feedback: < 100ms perceived (before server confirmation).

### Test Cases

- Login with valid email/password reaches Dashboard.
- Login with invalid credentials shows inline error, no redirect.
- OAuth (Google/Apple) login round-trip creates/links account and reaches Dashboard.
- OTP login flow completes MFA challenge before granting a session.
- Dashboard renders all 5 KPI cards with correct values for a seeded account.
- Dashboard with zero data renders empty states, not errors.
- Add/edit/delete a transaction updates the Transactions table and Dashboard's Recent Transactions without a full reload.
- Create a category budget; overspending it flips its status badge and bar color (on-track → near-limit → over-budget).
- Create a savings goal; contributing funds updates its progress ring and the Dashboard's goal summary.
- Reports page date-range change re-renders all charts with the new range.
- Export buttons (PDF/CSV/Excel) trigger a download request with the current filter/date-range context.
- Theme toggle persists across a page reload and across login → dashboard navigation.
- Non-MVP nav items (Investments, AI Assistant, Subscriptions, Bills) route to their placeholder screen without erroring.

### Open risks / assumptions

- **No `tokens.json` exists.** The mockup's inline styles are the only design source — treating them as provisional token candidates (see NFR above) pending client sign-off, per `frontend-design`'s re-entry contract if colors change later.
- **Settings and Profile pages are unstyled placeholders in the mockup** but PRD §8 lists both as real MVP-relevant features (currency/country/timezone, notification preferences). Needs real design before scaffold — flagging as a design-asset gap, not assuming the placeholder is sufficient for MVP.
- **Subscriptions Tracker and Bills Reminder full-page views are stubbed as placeholders in the mockup**, but PRD §16's MVP Included/Excluded lists don't mention either explicitly (only the Dashboard's summary widgets for both are fully designed). Needs human confirmation: are full Subscriptions/Bills pages in MVP, or dashboard-widget-only for v1? Candidate Forbidden Scope item for `/fleet-spec`.
- Mobile app (Flutter/React Native, PRD §13) is out of this repo's scope entirely — PLAN.md and downstream specs cover the web app only unless told otherwise.
- Charts in the mockup are hand-drawn inline SVG (not a charting library), while PRD §13 recommends Recharts — `frontend-design` at scaffold time should decide whether to keep hand-rolled SVG (matches mockup exactly) or reimplement with Recharts (PRD's stated preference, easier to extend) — flagging as a decision for scaffold time, not resolved here.

---

## Backend

### Scope & responsibilities

Node + Express + TypeScript, REST API under `/api/v1`, per PRD §13/§15. Owns: authentication (email/password, Google/Apple OAuth, OTP, MFA, password reset — PRD §8), all business logic and calculations (budget status thresholds, savings-goal progress, cash-flow aggregation, dashboard KPI computation), category/transaction/budget/goal CRUD, reports generation (PDF/CSV/Excel export), notification dispatch (email/push/SMS triggers — actual delivery via Firebase Cloud Messaging + SendGrid per PRD §13), SaaS billing integration (Stripe, PRD §13/§9 subscription plans: Free/Pro/Family), admin-panel APIs (PRD §10), and RBAC enforcement across the four PRD §11 roles (User, Family Admin, Admin, Super Admin).

**Explicitly excluded from MVP** (PRD §16): Bank Sync (Plaid/Open Banking), AI Financial Assistant, OCR receipt scanning, Investment Tracking, Family Accounts (shared workspace), Tax Reports. Debt Tracker and Subscription Tracker business logic: see Open risks — same ambiguity as the frontend's placeholder-page question, needs the same human confirmation before committing backend module scope.

### Interfaces / contracts

API modules (PRD §15), MVP-scoped: Authentication (`/api/v1/auth/*`), User (`/api/v1/users/*`), Dashboard (`/api/v1/dashboard`), Transactions (`/api/v1/transactions/*`), Budgets (`/api/v1/budgets/*`), Goals (`/api/v1/goals/*`), Reports (`/api/v1/reports/*`), Notifications (`/api/v1/notifications/*`), Payments/Billing (`/api/v1/billing/*`), Admin (`/api/v1/admin/*`). Investments and AI modules exist in the PRD's module list but are post-MVP — stub/deferred, not built now.

- Auth: JWT (short-lived access + httpOnly-cookie refresh), OAuth 2.0 for Google/Apple, OTP via SMS/email for passwordless and MFA challenges (PRD §12 Security: JWT, OAuth, RBAC, audit logging).
- All money amounts transported as integer minor-units (cents) or fixed-point decimal strings, never floating point — required for financial correctness even though the PRD doesn't say so explicitly.
- Billing: Stripe webhooks drive subscription-plan state (`Free`/`Pro`/`Family`) — this is the system of record for plan tier, not a client-set field.
- Full contract detail (request/response shapes, status codes) is refined at `/fleet-spec`, cross-checked against `master-spec.md`'s Relations table.

### Edge cases

- Duplicate transaction submission (double-click / retried request) — must be idempotent, not double-counted.
- Concurrent budget update from two devices — last-write-wins with a `updatedAt` check to at least detect (not necessarily resolve) the conflict for MVP.
- Stripe webhook arrives out of order or is retried (Stripe's own at-least-once delivery) — must be idempotent on `event.id`.
- Password reset token reuse or expiry.
- OTP code expiry, max-attempt lockout, and resend rate-limiting.
- Currency conversion / multi-currency accounts are NOT in MVP scope (single `Preferred Currency` per PRD §8 User Profile) — reject or ignore mixed-currency input rather than silently mis-summing.
- Deleting a category that has existing transactions referencing it — reassign to "Miscellaneous" or block deletion, needs a product decision (flagging, not assuming).
- Budget period boundaries (monthly/weekly/yearly per PRD §8) crossing a calendar-month/year edge — cash-flow and budget-status aggregation must use the account's timezone (PRD §8 User Profile), not server UTC, to avoid off-by-one-day bucketing.
- Rate limiting / abuse on auth endpoints (login attempts, OTP requests) per PRD §12 security posture.
- Soft-deleted vs. hard-deleted records for audit-log completeness (PRD §12 Audit Logging, GDPR).
- GDPR data-export/right-to-erasure request handling — PRD §12 requires GDPR compliance; MVP needs at minimum an export-my-data and delete-my-account path even if the full admin tooling for it is post-MVP.

### Non-functional requirements

- Multi-tenant architecture, horizontal scaling, Redis cache, queue workers (PRD §12 Scalability) — queue workers needed at minimum for notification dispatch and report generation, so those are async jobs, not synchronous request handlers.
- 99.9% uptime SLA (PRD §12 Availability).
- Encryption at rest and in transit; RBAC; audit logging; SOC 2 readiness (PRD §12 Security) — audit logging is a cross-cutting concern (every mutating endpoint), not a single module's responsibility.

#### Latency Standards

- API response time (PRD §12): p95 < 300ms for CRUD/read endpoints; draft p50 < 120ms, p99 < 800ms.
- Report generation (PDF/CSV/Excel export) is expected to exceed the 300ms budget — runs as an async queue job with a polling/webhook completion signal, not a synchronous response.
- Dashboard aggregation endpoint: p95 < 500ms (heavier aggregate query than simple CRUD, still needs to fit under the frontend's 2s full-dashboard-load budget).

### Test Cases

- Register via email/password; verify password hashing (never stored/returned in plaintext).
- Login via Google/Apple OAuth creates or links the correct user record.
- OTP + MFA challenge blocks login until satisfied.
- JWT refresh flow issues a new access token without requiring re-login, and rejects an expired/revoked refresh token.
- Create/update/delete a transaction; verify it appears correctly in dashboard aggregation.
- Create a category budget; verify status thresholds (on-track/near-limit/over-budget) compute correctly at boundary values (exactly 85%, exactly 100%).
- Create a savings goal; verify progress percentage and ring data compute correctly, including >100% (goal exceeded).
- Stripe webhook for subscription upgrade/downgrade correctly updates the user's plan tier; duplicate webhook delivery is a no-op.
- Rate limiting kicks in after N failed login/OTP attempts.
- Report export (CSV/PDF/Excel) job completes and is retrievable; verify totals match the underlying transaction data.
- RBAC: a `User` role cannot access `/api/v1/admin/*`; an `Admin` cannot access another tenant's data outside their permission scope.
- GDPR export/delete-account endpoints return a complete data snapshot / fully remove PII respectively.

### Open risks / assumptions

- **Debt Tracker and Subscription Tracker**: PRD §8 lists both as full Core Features, but PRD §16's MVP Included/Excluded lists mention neither explicitly, and the design mockup stubs both as UI placeholders. Needs human confirmation of MVP scope before `/fleet-spec` locks module boundaries — same ambiguity flagged in Frontend's Open risks, listing here too since it affects backend module/DB-table scope directly. Candidate Forbidden Scope item.
- NestJS was the PRD's named backend framework; `node-express` was chosen instead since no NestJS template exists (see Stack decision above) — this trades NestJS's built-in DI/module structure for faster start with less built-in opinionation; worth enforcing an equivalent folder/module convention manually during scaffold so a multi-builder team doesn't drift (PRD §13, §7 Team/timeline signals: multiple builders will touch this API surface).
- GraphQL is listed as "optional" in PRD §13 — treating as out of scope for MVP (REST only) unless a human says otherwise.
- Bank Sync (Plaid) is MVP-excluded but multiple later integrations (PRD §21 Future Integrations: Plaid, PayPal, Razorpay, UPI, QuickBooks, Xero, Zapier, etc.) assume a webhook/integration-ingestion layer eventually exists — not built now, but worth not architecting the transactions/notifications modules in a way that makes adding it later a rewrite.

---

## Database

### Scope & responsibilities

PostgreSQL, per PRD §13/§14. Owns the relational schema for all MVP modules: Users, Accounts, Categories, Transactions, Budgets, Goals, Notifications, Reports (materialized/cached aggregates), Plans, Payments, Audit Logs. Investments, Family Workspaces, and (pending confirmation) Debts/Subscriptions/Bills tables are deferred or conditional — see Open risks.

### Interfaces / contracts

Consumed exclusively through the backend's data-access layer — no direct frontend or external access. Core MVP tables (draft, refined into full DDL at `/fleet-spec`):
- `users` (auth identity, profile: currency/country/timezone/notification prefs, role)
- `accounts` (a user's financial accounts — cash/bank/card — MVP is manual-entry only, no Bank Sync)
- `categories` (system default + user-custom, per PRD §8 Expense Categories list)
- `transactions` (income + expense, FK to `accounts`/`categories`, amount as integer minor-units, recurring-transaction flag)
- `budgets` (period type: monthly/weekly/yearly, FK to `categories`, limit amount)
- `goals` (savings goals: target amount, deadline, current progress, recurring contribution)
- `notifications` (queued + sent log, channel: email/push/SMS)
- `plans` (Free/Pro/Family tier definitions)
- `payments` (Stripe subscription/invoice records, keyed by Stripe `event.id` for idempotency)
- `audit_logs` (append-only, every mutating action across all modules per PRD §12)

### Edge cases

- Foreign-key integrity when deleting a `category` still referenced by `transactions`/`budgets` — needs an explicit ON DELETE policy decision (restrict vs. reassign-to-default), not a default left to migration-tool defaults.
- Monetary columns must be fixed-point (`numeric`/integer minor-units), never `float`/`double` — rounding-error risk in aggregation otherwise.
- Timezone-aware `date`/`timestamp` handling for budget-period boundaries (see Backend edge cases) — store UTC, bucket by the user's stored timezone at query time.
- Soft-delete vs. hard-delete columns needed for GDPR erasure vs. audit-log retention — these two requirements are in tension (PRD §12 both GDPR and Audit Logging) and need an explicit per-table policy, not one default for everything.
- Concurrent writes to the same `budgets`/`goals` row — needs an `updated_at`/version column for optimistic-concurrency detection (ties to Backend's "detect, don't necessarily resolve" MVP stance).
- Multi-tenant data isolation (PRD §12 Multi-tenant Architecture) — every tenant-scoped table needs a `user_id`/`tenant_id` index and query-layer enforcement, not just a column that could be forgotten in a `WHERE` clause.
- Large transaction history pagination/performance (PRD §8 mockup shows "248 transactions" for a single seeded user — real users will have thousands) — needs an index on `(account_id, date)` at minimum from day one.

### Non-functional requirements

- Multi-tenant architecture, horizontal scaling readiness (PRD §12) — Postgres itself scales vertically/read-replica, not horizontally-sharded, for MVP; flagging this as the realistic interpretation of PRD's "horizontal scaling" NFR at the database layer specifically (the app tier scales horizontally, not the single Postgres primary).
- Redis cache (PRD §12) sits in front of expensive aggregate queries (dashboard KPIs, reports) — cache invalidation strategy needed per mutating endpoint that affects it.
- Encryption at rest (PRD §12) — RDS-level encryption at rest for staging/production tiers (ties to Devops's Terraform database module).

#### Latency Standards

- Point-lookup / simple CRUD queries: p95 < 50ms.
- Dashboard aggregation query (multi-table join/sum across transactions+budgets+goals for one user): p95 < 250ms — feeds the backend's 500ms dashboard-endpoint budget with room for app-layer overhead.
- Report-generation queries (date-range scans across full transaction history): no hard latency budget — runs as an async job (see Backend NFR).

### Test Cases

- Migration applies cleanly on an empty database and is idempotent/re-runnable in dev.
- Deleting a referenced `category` follows the defined FK policy (reject or reassign) rather than erroring unhandled or silently orphaning rows.
- Inserting a transaction with a non-existent `account_id`/`category_id` is rejected at the FK constraint level, not just app-layer validation.
- Monetary aggregation (sum of transactions for a budget period) is exact to the cent across a large volume of rows (no float drift).
- Two concurrent updates to the same `budget` row are both persisted with the second write detectable via `updated_at`/version mismatch.
- Multi-tenant query isolation: a query scoped to `user_id=A` never returns rows belonging to `user_id=B`, verified with seeded cross-tenant data.
- `audit_logs` row is created for every mutating operation across at least Transactions, Budgets, Goals, and Billing modules.

### Open risks / assumptions

- **Debts, Subscriptions, Bills tables**: conditional on the same MVP-scope confirmation flagged in Frontend/Backend Open risks. Not modeled in the MVP schema draft above pending that answer.
- Family Workspaces (PRD §14 Database Modules lists it) is MVP-excluded per PRD §16 — no `family_workspaces` table in MVP schema; will need a join-table-heavy addition later (shared budgets/goals/reports across multiple `user_id`s) — worth keeping `budgets`/`goals` schema from day one in a shape that doesn't make that addition a rewrite (e.g. owner reference is nullable/extensible rather than hard-assumed single-owner), without actually building shared-workspace logic now.
- Investments table (PRD §14) deferred with the same reasoning — MVP-excluded per PRD §16.

---

## Devops

### Scope & responsibilities

AWS (Terraform three-tier: demo/staging/production per design doc §7a), Docker, Kubernetes (staging/production), GitHub Actions CI/CD, per PRD §13. Demo target: `aws-docker` (single EC2 + Docker Compose, SSH-tunneled build, no registry — see Stack decision above). Owns: all infrastructure-as-code, CI pipeline (build/test/lint gates before merge), container image builds for frontend + backend, secrets management, monitoring/alerting, and the demo-tier deploy/teardown lifecycle via `/fleet-demo`.

### Interfaces / contracts

- `infrastructure/terraform/{demo,staging,production}.tfvars` — three tiers, one module set (`modules/compute`, `modules/networking`, `modules/database`, `modules/monitoring`), generated at `/fleet-scaffold` time by `am-scaffold-devops` regardless of which tier is applied first.
- CI (GitHub Actions): lint → typecheck → unit tests → build → (on merge to a release branch) deploy trigger. Never pushes to `main` directly — matches the framework's own branch-protection guardrail.
- Demo deploy: `docker context create demo --docker "host=ssh://<user>@<demo-ip>"` then `docker --context demo compose up --build -d`, per the `aws-docker` demo-target template — no ECR/registry for MVP.
- CDN (PRD §12 Scalability) fronts the Next.js static assets; Redis and queue workers (PRD §12) are provisioned as part of the compute/networking modules, not bolted on ad hoc later.

### Edge cases

- Terraform apply failure partway through (e.g. RDS provisioning succeeds, compute module fails) — must be safely re-appliable, not left in a half-provisioned unrecoverable state.
- Secrets (Stripe keys, JWT signing secret, OAuth client secrets, SendGrid/FCM credentials) must never appear in Terraform state in plaintext or in any committed file — environment variables / a secrets manager, documented in `.env.example` per the framework's own no-hardcoded-secrets guardrail.
- Demo-tier `terraform destroy` between pitches must not silently destroy staging/production resources — tier isolation (separate state/workspace per `.tfvars`) is required, not just separate variable files applied to the same state.
- CI pipeline failure on a dependency vulnerability (`npm audit`/equivalent) — should block merge, not just warn, given PRD §12's SOC 2 readiness goal.
- Database migration failure during a staging/production deploy — deploy pipeline must not leave the app running against a half-migrated schema.
- Redis cache unavailability — backend must degrade to direct-DB reads, not hard-fail, given PRD §12 treats Redis as a cache, not a system of record.

### Non-functional requirements

- 99.9% uptime SLA (PRD §12) — implies staging/production need at minimum multi-AZ RDS and health-checked auto-recovery compute, per the `postgres` template's tier table.
- Horizontal scaling + auto-scaling (PRD §12, and §19 Risk mitigation for "High infrastructure costs" explicitly names auto-scaling + efficient caching) — compute module for staging/production must be an auto-scaling group/ECS service, not a fixed single instance (that's the demo tier only).
- SOC 2 readiness (PRD §12) implies audit-log retention, access-controlled infra (least-privilege IAM), and monitoring/alerting from day one, not bolted on before a future audit.

#### Latency Standards

- CI pipeline (lint+typecheck+test+build) target: < 10 minutes end-to-end, so a builder's feedback loop per `/fleet-build` task stays fast.
- Demo deploy (`/fleet-demo` via `aws-docker`): target < 5 minutes from trigger to health-checked URL.

### Test Cases

- `terraform plan` on all three tfvars files produces a clean plan with no manual state edits required.
- CI pipeline fails the build on a lint/typecheck/test failure and blocks merge.
- CI pipeline fails the build on a detected high-severity dependency vulnerability.
- `/fleet-demo` deploy reaches a health-checked, reachable URL within the latency target above.
- `terraform destroy` on the demo tier's workspace/state does not affect staging or production resources (verified via separate state files/workspaces).
- Secrets are absent from `git log`/`git grep` across the repo and from Terraform state files.

### Open risks / assumptions

- Kubernetes is named in PRD §13 but the `aws` cloud template's tier table (ECS/Fargate for staging/production, per the framework's stack template) doesn't default to EKS — treating ECS/Fargate as the actual staging/production compute choice unless a human specifically wants EKS; flagging the mismatch rather than silently picking one.
- MRR/billing metrics (PRD §18 KPIs) imply an analytics/BI need beyond the in-app Reports module (e.g. a dashboard for the business, not just end-users) — not scoped into MVP infra, flagging as a likely Phase 2 devops ask (e.g. a data warehouse or BI tool integration) rather than building it speculatively now.

# frontend-spec.md

*Produced by /fleet-spec (Step 5), from the frontend section of PLAN.md. Same six fixed sections as every domain spec.*

<!-- FORBIDDEN_SCOPE_OVERRIDE: this spec documents Investment Tracking, Family Accounts, Tax Reports, Debt Tracker, Subscription Tracker, Bills Reminder, and mobile app as EXCLUDED/deferred (Forbidden Scope items), consistent with master-spec.md — it does not build any of them. Referencing an excluded item to say "not built" is not a violation of that exclusion. -->

## 1. Scope & responsibilities

Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui + React Query. Scaffolded into `apps/frontend/` by `am-scaffold-frontend`. Owns: public login/marketing surface, authenticated dashboard app shell (sidebar + topbar), all data-entry forms, all data-visualization surfaces, client-side auth/session handling, theme (light/dark) toggle + persistence, notification bell/toast UI, and CDN-delivered static assets (build step feeds `devops-spec.md §2`'s CDN).

No business logic beyond form validation and display formatting — all calculations (budget status, goal progress %, cash-flow totals, dashboard KPIs) are computed backend-side (`backend-spec.md §2.3`) and delivered ready-to-render.

**MVP page inventory**, confirmed 2026-07-17: Login, Dashboard, Transactions, Budgets, Savings Goals, Reports & Analytics, Settings, Profile. Sidebar ships all 11 nav items from day one; several route to a placeholder ("coming soon") screen rather than a full page, per Forbidden Scope: full pages excluded for Investments, AI Assistant, Subscriptions, and Bills; no nav-visible feature at all for Debt Tracker (no nav entry, no widget). Dashboard-only widgets ship for Subscriptions and Upcoming Bills (matches the design mockup's own placeholder stubs for those two dedicated pages).

Design-token source: `inputs/design/tokens.json` does not yet exist — `am-scaffold-frontend` must first derive an initial `tokens.json` from the candidate values in §4.2 below (extracted from `inputs/design/Finance Tracker.dc.html`), then build from that, since `design_token_guard.py` blocks any raw hex/spacing/font-size literal in `apps/frontend/` that isn't a `tokens.json` reference.

## 2. Interfaces / contracts

Cross-checked against `master-spec.md`'s Relations table — section numbers below correspond 1:1 to that table's Frontend ref column.

- **§2.1 Auth**: Login form (email/password), Google/Apple OAuth buttons, OTP/MFA challenge UI, forgot-password flow. Consumes `POST /api/v1/auth/{register,login,oauth/callback,otp/verify,password-reset}`. Stores JWT access token in memory (not localStorage — XSS surface), refresh token is an httpOnly cookie set by the backend.
- **§2.2 Profile**: Settings/Profile pages (real designs needed — see §6). Consumes `GET/PATCH /api/v1/users/me`.
- **§2.3 Dashboard**: 5 KPI cards, cash-flow area chart, category donut, budget-progress bars, savings-goal rings, recent-transactions list, upcoming-bills widget, subscriptions widget. Single aggregated `GET /api/v1/dashboard` call via React Query, no per-widget waterfall requests.
- **§2.4 Transactions/Categories**: searchable/filterable table, pagination, quick-add, export button. `GET/POST/PATCH/DELETE /api/v1/transactions`, `GET/POST /api/v1/categories`.
- **§2.5 Budgets**: overall summary + per-category cards + create-budget affordance. `GET/POST/PATCH/DELETE /api/v1/budgets`.
- **§2.6 Goals**: summary tiles + per-goal cards + add-funds action. `GET/POST/PATCH/DELETE /api/v1/goals`.
- **§2.7 Reports**: date-range picker, bar/line/donut charts, PDF/CSV/Excel export buttons. `GET /api/v1/reports`, `POST /api/v1/reports/export` (async — poll or webhook-style completion signal, not a blocking request given the >300ms budget).
- **§2.8 Notifications**: bell icon + toast/list UI. `GET /api/v1/notifications`.
- **§2.9 Billing**: plan display (Free/Pro/Family), upgrade/downgrade CTA. `POST /api/v1/billing/*`, Stripe Checkout/Portal redirect.
- **§2.10 Admin**: no admin UI in this MVP frontend scaffold (admin API exists per `backend-spec.md §2.10` for future/ops use; no frontend surface built now — flagged, not silently dropped).

## 3. Edge cases

- FE-EC-01: Zero transactions/budgets/goals on first run — dashboard and each page render a meaningful empty state, not a broken/empty chart.
- FE-EC-02: Session/access-token expiry mid-form-entry — silent refresh via the httpOnly refresh cookie, or preserved form state through a forced re-login.
- FE-EC-03: Non-USD `Preferred Currency` — locale-aware currency formatting everywhere amounts are displayed, never a hardcoded `$`.
- FE-EC-04: Budget/goal progress >100% (overspent budget, exceeded goal) — bar/ring and percentage render correctly, not clipped or broken.
- FE-EC-05: Long transaction descriptions/category names overflow fixed-width table columns/cards — truncate with ellipsis + full text on hover/tooltip.
- FE-EC-06: Concurrent edits to the same budget/transaction from two tabs/devices — background refetch must not silently overwrite in-progress unsaved edits in the active tab.
- FE-EC-07: Network failure mid quick-add — optimistic UI update rolls back cleanly with a visible error, not a stuck/ghost row.
- FE-EC-08: Theme toggle persists across sessions and across the login→app boundary.
- FE-EC-09: Pagination — last page with a partial row count; a deep link to a page number beyond total pages falls back to the last valid page.
- FE-EC-10: OAuth login where the provider email doesn't match an existing account, vs. an email already registered under a different provider — distinct, clear error states for each, not a generic failure.
- FE-EC-11: Placeholder-routed nav items render their "coming soon" screen without a console error or broken layout.

## 4. Non-functional requirements

### 4.1 Latency Standards

- Dashboard load: p50 < 800ms, p95 < 2s (PRD §12 hard requirement), p99 < 3.5s — including first KPI paint.
- Route transitions between sidebar sections: p95 < 300ms (client-side nav; data may load behind a skeleton).
- Quick-add optimistic UI feedback: < 100ms perceived, before server confirmation.

### 4.2 Other NFRs

- **Accessibility**: WCAG 2.1 AA — checked unconditionally by `am-qa-runner`'s axe-core scan on every e2e test regardless of this spec. Contrast ratios for `textFaint` on `card` backgrounds (both themes) need explicit verification during scaffold, not assumed from the mockup.
- **Design-token candidates** (from `inputs/design/Finance Tracker.dc.html`, pending formal client sign-off — treat as provisional, not final):
  - Colors (light / dark): `bg` `#F8FAFC`/`#0B1220`, `sidebarBg` `#FFFFFF`/`#0F172A`, `card` `#FFFFFF`/`#131C2E`, `cardAlt` `#F1F5F9`/`#1A2436`, `border` `#E2E8F0`/`#233047`, `text` `#0F172A`/`#F1F5F9`, `textMuted` `#64748B`/`#94A3B8`, `textFaint` `#94A3B8`/`#64748B`, `hoverBg` `#F1F5F9`/`#1A2436`, `inputBg` `#FFFFFF`/`#101828`.
  - Semantic: `primary` `#10B981` (positive/success), `secondary` `#3B82F6` (brand/primary action), `accent` `#8B5CF6`, `warning` `#F59E0B`, `danger` `#EF4444` — each needs a 10–20%-opacity "soft" variant for badges/icon backgrounds.
  - Typography: `Inter`, weights 400–800.
  - Radii: 8–16px range observed across cards/buttons/inputs.
  - Shadow: distinct light/dark card-shadow values (see mockup's `c.shadow`).

## 5. Test cases

| ID | Acceptance criterion | Tier | Notes |
|---|---|---|---|
| FE-TC-01 | Login with valid email/password reaches Dashboard | e2e | Exercises Relations row "Auth: register / login" |
| FE-TC-02 | Login with invalid credentials shows inline error, no redirect | integration | — |
| FE-TC-03 | OAuth (Google/Apple) login round-trip creates/links account and reaches Dashboard | e2e | Exercises Relations row "Auth: OAuth"; covers FE-EC-10 (mismatched-email and already-registered-under-different-provider cases both tested) |
| FE-TC-04 | OTP + MFA challenge blocks login until satisfied | integration | Exercises Relations row "Auth: OTP / MFA" |
| FE-TC-05 | Dashboard renders all 5 KPI cards with correct values for a seeded account | integration | Exercises Relations row "GET /dashboard" |
| FE-TC-06 | Dashboard with zero data renders empty states, not errors | unit | Covers FE-EC-01 |
| FE-TC-07 | Session refresh mid-form-entry preserves form state or refreshes silently | integration | Covers FE-EC-02 |
| FE-TC-08 | Amounts render in the account's `Preferred Currency`, never hardcoded `$` | unit | Covers FE-EC-03 |
| FE-TC-09 | Add/edit/delete a transaction updates the Transactions table and Dashboard's Recent Transactions without a full reload | e2e | Exercises Relations row "GET/POST/PATCH/DELETE /transactions" |
| FE-TC-10 | Quick-add network failure rolls back the optimistic row and shows an error | integration | Covers FE-EC-07 |
| FE-TC-11 | Long description/category text truncates with ellipsis and a hover tooltip | unit | Covers FE-EC-05 |
| FE-TC-12 | Create a category budget; overspending flips status badge/bar at 85% (near-limit) and 100% (over-budget) boundaries, and renders correctly above 100% | integration | Exercises Relations row "GET/POST/PATCH/DELETE /budgets"; covers FE-EC-04 |
| FE-TC-13 | Create a savings goal; contributing funds updates its progress ring and the Dashboard's goal summary, including >100% | integration | Exercises Relations row "GET/POST/PATCH/DELETE /goals"; covers FE-EC-04 |
| FE-TC-14 | Reports page date-range change re-renders all charts with the new range | integration | Exercises Relations row "GET /reports" |
| FE-TC-15 | Export buttons (PDF/CSV/Excel) trigger a download/async job with the current filter/date-range context | integration | Exercises Relations row "POST /reports/export" |
| FE-TC-16 | Theme toggle persists across a page reload and across login→dashboard navigation | unit | Covers FE-EC-08 |
| FE-TC-17 | Pagination: last page renders a partial row count correctly; a deep link past the last page falls back to the last valid page | unit | Covers FE-EC-09 |
| FE-TC-18 | Placeholder-routed nav items render their "coming soon" screen without erroring | unit | Covers FE-EC-11 |
| FE-TC-19 | Two tabs editing the same budget: the inactive tab's background refetch does not silently discard the active tab's unsaved edit | integration | Covers FE-EC-06 |
| FE-TC-20 | Dashboard load completes within the p95 < 2s Latency Standard under a seeded-data load test | e2e | Latency-linked; measured via load-testing tool per `test-case-authoring`'s guidance, not this suite directly |
| FE-TC-21 | axe-core WCAG 2.1 AA scan passes on every e2e test's rendered page | e2e | Unconditional per `am-qa-runner`, run regardless of this row's presence — listed for traceability |

## 6. Open risks / assumptions

- Settings and Profile pages have no real mockup design (mockup stubs both as "coming soon" placeholders) despite being MVP-relevant per PRD §8 — needs real design work before/during scaffold, not just the placeholder treatment.
- `tokens.json` doesn't exist yet; §4.2's candidates are provisional pending client sign-off. If any value changes after scaffold, route through `frontend-design`'s re-entry contract (update `tokens.json` before any dependent `apps/frontend/` write, per `design_token_guard.py`'s ordering constraint).
- Mockup's charts are hand-rolled inline SVG; PRD §13 names Recharts as the recommended charting library. Decision on which to actually scaffold with is deferred to `am-scaffold-frontend` — not resolved here.

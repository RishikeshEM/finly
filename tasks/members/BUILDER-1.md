# tasks/members/BUILDER-1.md

<!-- FORBIDDEN_SCOPE_OVERRIDE: this file documents that Investments and AI Assistant get placeholder ("coming soon") screens only, and that Subscriptions/Bills get Dashboard-widget-only treatment with no dedicated page — all per master-spec.md's Forbidden Scope, referenced here to confirm exclusion, not to build any of them. -->

*One per person, produced by /fleet-tasks. Lists only this role's assigned tasks with full detail.*

## Assigned tasks

### FE-01 — Design tokens and UI foundation setup

- **Domain:** frontend
- **Spec section:** frontend-spec.md §4.2
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** —
- **Branch:** `feat/builder-1/FE-01-design-tokens-and-ui-foundation-setup`

Derive `inputs/design/tokens.json` from the candidate values in frontend-spec.md §4.2 (extracted from the mockup — colors, typography, radii, shadows) before any other frontend write — `design_token_guard.py` blocks raw hex/spacing/font-size literals in `apps/frontend/` that aren't `tokens.json` references. Set up Next.js/Tailwind/shadcn scaffolding conventions. Do this first — every other frontend task depends on it.

### FE-02 — Auth pages (login, OAuth, OTP, MFA, reset)

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.1
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** BE-01, FE-01
- **Branch:** `feat/builder-1/FE-02-auth-pages-login-oauth-otp-mfa-reset`

Blocked on `BUILDER-2`'s `BE-01` — check `origin/main` before branching; `dependency_gate.py` enforces this. Covers FE-EC-10 (distinct error states for OAuth email-mismatch vs. already-registered-under-different-provider).

### FE-03 — App shell (sidebar, topbar, theme, placeholders)

- **Domain:** frontend
- **Spec section:** frontend-spec.md §1
- **Complexity:** M
- **Risk:** Low
- **Depends on:** FE-01
- **Branch:** `feat/builder-1/FE-03-app-shell-sidebar-topbar-theme-placeholders`

All 11 nav items ship from day one. Investments, AI Assistant, Subscriptions, and Bills route to a placeholder ("coming soon") screen — no dedicated page for any of them in this MVP. Covers FE-EC-08 (theme persistence), FE-EC-11 (placeholder screens render cleanly).

### FE-04 — Dashboard page

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.3
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** BE-06, FE-03
- **Branch:** `feat/builder-1/FE-04-dashboard-page`

5 KPI cards, cash-flow area chart, category donut, budget-progress bars, savings-goal rings, recent-transactions list, upcoming-bills widget, subscriptions widget — single aggregated fetch via React Query, no per-widget waterfall. Covers FE-EC-01 (empty states for first-run users). p95 < 2s load target.

### FE-05 — Transactions page

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.4
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** BE-03, FE-03
- **Branch:** `feat/builder-1/FE-05-transactions-page`

Covers FE-EC-05 (long-text truncation), FE-EC-07 (optimistic quick-add rollback on network failure), FE-EC-09 (pagination edge cases).

### FE-06 — Budgets page

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.5
- **Complexity:** S
- **Risk:** Low
- **Depends on:** BE-04, FE-03
- **Branch:** `feat/builder-1/FE-06-budgets-page`

Covers FE-EC-04 (progress bar/percentage rendering correctly above 100%).

### FE-07 — Savings goals page

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.6
- **Complexity:** S
- **Risk:** Low
- **Depends on:** BE-05, FE-03
- **Branch:** `feat/builder-1/FE-07-savings-goals-page`

Covers FE-EC-04 (progress ring rendering correctly above 100%).

### FE-08 — Reports and analytics page

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.7
- **Complexity:** M
- **Risk:** Low
- **Depends on:** BE-07, FE-03
- **Branch:** `feat/builder-1/FE-08-reports-and-analytics-page`

Date-range picker, bar/line/donut charts, PDF/CSV/Excel export buttons wired to the async export job from `BE-07`.

### FE-09 — Settings and profile pages

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.2
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** BE-02, FE-03
- **Branch:** `feat/builder-1/FE-09-settings-and-profile-pages`

No real mockup design exists for these two pages (stubbed as placeholders there) despite being MVP-relevant per the PRD — needs real design work as part of this task, not just a placeholder treatment. Flag to the project owner if design direction is unclear before building.

### FE-10 — Notifications UI

- **Domain:** frontend
- **Spec section:** frontend-spec.md §2.8
- **Complexity:** S
- **Risk:** Low
- **Depends on:** BE-08, FE-03
- **Branch:** `feat/builder-1/FE-10-notifications-ui`

Bell icon + toast/list UI for the notification types listed in `BE-08`.

## Build reminders

- Build in-context by default (design doc §1) — `am-builder` as a subagent is opt-in, only worth it when fanning out several independent tasks at once.
- Test in-context for S-complexity/Low-risk tasks (`FE-06`, `FE-07`, `FE-10`); escalate to `am-tester` (isolated subagent) for M/L-complexity or Medium/High-risk tasks (everything else on this list).
- `am-code-reviewer` always runs as a subagent before pushing — unconditionally.
- `main` is protected — never push directly; open an MR from your feature branch.
- `dependency_gate.py` blocks branch creation if a declared dependency isn't on `origin/main` yet — most of your tasks depend on `BUILDER-2`'s backend endpoints landing first. Coordinate on `BE-01`, `BE-03`, `BE-04`, `BE-05`, `BE-06`, `BE-07`, `BE-08`, and `BE-02` specifically since your whole task list is downstream of theirs.
- `design_token_guard.py` blocks any raw hex/spacing/font-size literal in `apps/frontend/` not backed by a `tokens.json` reference — always land `FE-01`'s token values first.

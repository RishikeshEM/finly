# tasks/members/TECH-LEAD.md

*One per person, produced by /fleet-tasks. Lists only this role's assigned tasks with full detail.*

## Assigned tasks

### DO-01 — Terraform three-tier module set

- **Domain:** devops
- **Spec section:** devops-spec.md §2
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** —
- **Branch:** `feat/tech-lead/DO-01-terraform-three-tier-module-set`

`{demo,staging,production}.tfvars` against one module set (`modules/compute`, `modules/networking`, `modules/database`, `modules/monitoring`), all three generated regardless of which tier is applied first. Staging/production compute is ECS/Fargate, not EKS. Covers DO-EC-01 (safe re-apply after a partial failure), DO-EC-03 (tier isolation via separate state/workspace per tfvars file).

### DO-02 — CI pipeline (GitHub Actions)

- **Domain:** devops
- **Spec section:** devops-spec.md §3 (DO-EC-04)
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** —
- **Branch:** `feat/tech-lead/DO-02-ci-pipeline-github-actions`

`.github/workflows/ci.yml` (Git host is GitHub per master-spec.md, not GitLab): lint → typecheck → unit tests → build → deploy trigger on merge. Blocks merge on a high-severity dependency vulnerability, not just a warning.

### DO-03 — Secrets management setup

- **Domain:** devops
- **Spec section:** devops-spec.md §3 (DO-EC-02)
- **Complexity:** S
- **Risk:** High
- **Depends on:** —
- **Branch:** `feat/tech-lead/DO-03-secrets-management-setup`

`.env.example` covering: JWT signing key, Google/Apple OAuth client secrets, OTP/SMS + SendGrid + FCM provider keys, Stripe API + webhook signing secret. Small task, high consequence if a real secret ever lands in git history or Terraform state — `secret_scanner.py` backs this up but don't rely on it as the only check.

### DO-04 — Demo deploy lifecycle wiring

- **Domain:** devops
- **Spec section:** devops-spec.md §7
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DO-01
- **Branch:** `feat/tech-lead/DO-04-demo-deploy-lifecycle-wiring`

`docker context create demo --docker "host=ssh://<user>@<demo-ip>"` then `docker --context demo compose up --build -d` — registry-free (no ECR) for MVP, per the confirmed `aws-docker` demo target. Wires up `/fleet-demo`. Target: < 5 min trigger-to-health-checked-URL.

### DO-05 — Monitoring, alerting, and audit-log retention

- **Domain:** devops
- **Spec section:** devops-spec.md §4.2
- **Complexity:** M
- **Risk:** Medium
- **Depends on:** DO-01, DB-05
- **Branch:** `feat/tech-lead/DO-05-monitoring-alerting-and-audit-log-retention`

Blocked on `BUILDER-3`'s `DB-05` (audit_logs table) — check `origin/main` before branching. Covers SOC 2 readiness posture: least-privilege IAM per service, monitoring/alerting from day one, audit-log retention policy.

## Build reminders

- Build in-context by default (design doc §1) — `am-builder` as a subagent is opt-in, only worth it when fanning out several independent tasks at once.
- Test in-context for S-complexity/Low-risk tasks — none of your tasks qualify (`DO-03` is S-complexity but High risk); escalate to `am-tester` (isolated subagent) for all five tasks on this list.
- `am-code-reviewer` always runs as a subagent before pushing — unconditionally.
- `main` is protected — never push directly; open an MR from your feature branch.
- `dependency_gate.py` blocks branch creation if a declared dependency isn't on `origin/main` yet — `DO-05` is the only one of your tasks with a cross-role dependency (`BUILDER-3`'s `DB-05`); the rest are independent of the other three roles' build tasks since infra was already scaffolded at `/fleet-scaffold`.

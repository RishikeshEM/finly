# devops-spec.md

*Produced by /fleet-spec (Step 5), from the devops section of PLAN.md. Same six fixed sections as every domain spec.*

<!-- FORBIDDEN_SCOPE_OVERRIDE: this spec references the Reports module (an in-scope MVP feature, not the excluded Tax Reports item) and reiterates the single-region-only constraint that is itself a Forbidden Scope item in master-spec.md — restating a documented exclusion is not a violation of it. -->

## 1. Scope & responsibilities

AWS (Terraform three-tier: demo/staging/production), Docker, GitHub Actions CI/CD. Scaffolded into `infrastructure/` (plus root-level shared files) by `am-scaffold-devops`. Owns: all infrastructure-as-code, CI pipeline (lint/typecheck/test/build gates, dependency-vulnerability scanning), container image builds for frontend + backend, secrets management, monitoring/alerting, and the demo-tier deploy/teardown lifecycle via `/fleet-demo`.

Staging/production compute: ECS/Fargate (the `aws` cloud template's default tier) — not EKS/Kubernetes, despite PRD §13 naming Kubernetes generally (see `master-spec.md` Forbidden Scope and §6 below).

## 2. Interfaces / contracts

Cross-checked against `master-spec.md`'s Relations table.

- `infrastructure/terraform/{demo,staging,production}.tfvars` — one module set (`modules/compute`, `modules/networking`, `modules/database`, `modules/monitoring`), all three generated at scaffold time regardless of which tier is applied first.
- CI (`.github/workflows/ci.yml`, per §8 Git host below): lint → typecheck → unit tests → build → (on merge to a release branch) deploy trigger. Never pushes to `main` directly.
- Demo deploy: `docker context create demo --docker "host=ssh://<user>@<demo-ip>"` then `docker --context demo compose up --build -d` — no ECR/registry for MVP (registry-free default per the `aws-docker` demo-target template).
- CDN fronts the Next.js static assets (`frontend-spec.md §1`); Redis + queue workers provisioned as part of the compute/networking modules (`backend-spec.md §4.2`).
- Secrets consumed by the backend: JWT signing key, Google/Apple OAuth client secrets, OTP/SMS + SendGrid + FCM provider keys, Stripe API + webhook signing secret — documented in `.env.example`, never committed.

## 3. Edge cases

- DO-EC-01: Terraform apply failure partway through a multi-resource change (e.g. RDS provisions, compute module fails) — must be safely re-appliable, not left in a half-provisioned state.
- DO-EC-02: Secrets must never appear in Terraform state in plaintext or in any committed file.
- DO-EC-03: Demo-tier `terraform destroy` between pitches must not affect staging/production — tier isolation via separate state/workspace per `.tfvars`, not just separate variable files applied to one shared state.
- DO-EC-04: CI pipeline failure on a high-severity dependency vulnerability blocks merge, not just warns (SOC 2 readiness posture).
- DO-EC-05: Database migration failure during a staging/production deploy must not leave the app running against a half-migrated schema — deploy pipeline halts and rolls back rather than proceeding.
- DO-EC-06: Redis cache unavailability — backend degrades to direct-DB reads (Redis is a cache, not a system of record, per `backend-spec.md §4.2`), not a hard failure.

## 4. Non-functional requirements

### 4.1 Latency Standards

- CI pipeline (lint+typecheck+test+build): target < 10 minutes end-to-end.
- Demo deploy (`/fleet-demo` via `aws-docker`): target < 5 minutes from trigger to health-checked URL.

### 4.2 Other NFRs

- 99.9% uptime SLA — staging/production need multi-AZ RDS (per the `postgres` stack template's tier table) and health-checked auto-recovery compute (ECS/Fargate auto-scaling group, not a fixed single instance — that's demo tier only).
- Auto-scaling + efficient caching are the PRD's own named mitigation for its "high infrastructure costs" risk — staging/production compute module must be an auto-scaling service, not a fixed-size deployment.
- SOC 2 readiness: audit-log retention (ties to `database-spec.md §2.9`), least-privilege IAM roles per service, monitoring/alerting from day one (not bolted on before a future audit).
- Single geographic deployment region only in MVP — no cross-region failover (`master-spec.md` Forbidden Scope).

## 5. Test cases

| ID | Acceptance criterion | Tier | Notes |
|---|---|---|---|
| DO-TC-01 | `terraform plan` on all three tfvars files produces a clean plan with no manual state edits required | integration | — |
| DO-TC-02 | CI pipeline fails the build and blocks merge on a lint/typecheck/test failure | integration | — |
| DO-TC-03 | CI pipeline fails the build on a detected high-severity dependency vulnerability | integration | Covers DO-EC-04 |
| DO-TC-04 | `/fleet-demo` deploy reaches a health-checked, reachable URL within the < 5 minute Latency Standard | e2e | Latency-linked |
| DO-TC-05 | `terraform destroy` on the demo-tier workspace/state does not affect staging or production resources | integration | Covers DO-EC-03 |
| DO-TC-06 | Secrets are absent from `git log`/`git grep` across the repo and from Terraform state files | integration | Covers DO-EC-02 |
| DO-TC-07 | A failed Terraform apply partway through a multi-resource change can be safely re-applied without manual state surgery | integration | Covers DO-EC-01 |
| DO-TC-08 | A deploy is halted (not left half-migrated) if the database migration step fails | integration | Covers DO-EC-05 |
| DO-TC-09 | Backend serves dashboard/report requests (degraded but correct) when Redis is unreachable | integration | Covers DO-EC-06 |
| DO-TC-10 | CI pipeline (lint+typecheck+test+build) completes within the < 10 minute Latency Standard | e2e | Latency-linked |

## 6. Open risks / assumptions

- PRD §13 names Kubernetes under Infrastructure, but the `aws` cloud stack template's tier table defaults staging/production to ECS/Fargate, not EKS — flagging this mismatch explicitly rather than silently resolving it; revisit if a human specifically wants EKS.
- MRR/billing KPIs (PRD §18) imply a business-facing analytics/BI need beyond the in-app financial-reports module — not scoped into MVP infra; likely a Phase 2 devops ask (e.g. a data warehouse or BI tool integration), not built speculatively now.
- ECR-backed (registry) demo variant is available but not the default — only worth adopting if multiple simultaneous demo instances or frequent fast redeploys become a real need (see the `aws-docker` template's own guidance).

## 7. Demo target

**Chosen:** `aws-docker`

**Rejected alternative(s) and why:** `railway` — recurring ~$5/mo floor whether or not the demo is active, and its IaC path (`railway.ts`) is explicitly marked experimental by Railway's own docs. `aws-docker` achieves genuine $0 idle cost via `terraform destroy` between pitches, directly addressing PRD §19's named "high infrastructure costs" risk, and keeps demo/staging/production on one platform (AWS) rather than splitting operational tooling across two. Confirmed by user checkpoint at `/fleet-plan`.

## 8. Git host

**Chosen:** `github`

**Rationale:** PRD §13 explicitly names GitHub Actions (not GitLab CI) under its recommended Infrastructure stack — `am-scaffold-devops` emits `.github/workflows/ci.yml` accordingly.

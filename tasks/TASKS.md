# TASKS.md

*Produced by /fleet-tasks (Steps 7-8). Role-anonymised — safe to share with the client. Real names live only in `.fleet/team.local.yaml`, which is gitignored and never enters this file (design doc §6).*

Team: 4 members, one per domain (`BUILDER-1` frontend, `BUILDER-2` backend, `BUILDER-3` database, `TECH-LEAD` devops). Granularity: narrower, single-domain tasks per person, per `task-decomposition`'s headcount guidance. Dependency order verified via `task_graph` — no cycles.

**High-fanout tasks** (depended on by tasks belonging to a different role, not just same-role work) are sequenced first for their assignee rather than batched behind unrelated work: `DB-01` (blocks all of `BUILDER-2`'s backend work) and `BE-01` (blocks `BUILDER-1`'s auth-dependent frontend work), per `task_graph`'s in-degree data.

| Task ID | Domain | Spec section | Complexity | Risk | Depends on | Assignee (role) |
|---|---|---|---|---|---|---|
| DB-01 | database | database-spec §2.1 | M | Medium | — | BUILDER-3 |
| DB-02 | database | database-spec §2.3 | M | Medium | DB-01 | BUILDER-3 |
| DB-03 | database | database-spec §2.4, §2.5 | M | Medium | DB-01 | BUILDER-3 |
| DB-04 | database | database-spec §2.6, §2.7, §2.8 | S | Low | DB-01 | BUILDER-3 |
| DB-05 | database | database-spec §2.9 | S | Medium | DB-01 | BUILDER-3 |
| DB-06 | database | database-spec §2.2 | S | Low | DB-01 | BUILDER-3 |
| BE-01 | backend | backend-spec §2.1 | L | High | DB-01 | BUILDER-2 |
| BE-02 | backend | backend-spec §2.2 | S | Low | BE-01 | BUILDER-2 |
| BE-03 | backend | backend-spec §2.4 | M | Medium | DB-02, DB-06 | BUILDER-2 |
| BE-04 | backend | backend-spec §2.5 | M | Medium | DB-03 | BUILDER-2 |
| BE-05 | backend | backend-spec §2.6 | S | Low | DB-03 | BUILDER-2 |
| BE-06 | backend | backend-spec §2.3 | M | Medium | BE-03, BE-04, BE-05 | BUILDER-2 |
| BE-07 | backend | backend-spec §2.7 | M | Medium | BE-03 | BUILDER-2 |
| BE-08 | backend | backend-spec §2.8 | M | Medium | DB-04 | BUILDER-2 |
| BE-09 | backend | backend-spec §2.9 | L | High | DB-04 | BUILDER-2 |
| BE-10 | backend | backend-spec §2.10 | M | High | BE-01, DB-05 | BUILDER-2 |
| FE-01 | frontend | frontend-spec §4.2 | M | Medium | — | BUILDER-1 |
| FE-02 | frontend | frontend-spec §2.1 | M | Medium | BE-01, FE-01 | BUILDER-1 |
| FE-03 | frontend | frontend-spec §1 | M | Low | FE-01 | BUILDER-1 |
| FE-04 | frontend | frontend-spec §2.3 | M | Medium | BE-06, FE-03 | BUILDER-1 |
| FE-05 | frontend | frontend-spec §2.4 | M | Medium | BE-03, FE-03 | BUILDER-1 |
| FE-06 | frontend | frontend-spec §2.5 | S | Low | BE-04, FE-03 | BUILDER-1 |
| FE-07 | frontend | frontend-spec §2.6 | S | Low | BE-05, FE-03 | BUILDER-1 |
| FE-08 | frontend | frontend-spec §2.7 | M | Low | BE-07, FE-03 | BUILDER-1 |
| FE-09 | frontend | frontend-spec §2.2 | M | Medium | BE-02, FE-03 | BUILDER-1 |
| FE-10 | frontend | frontend-spec §2.8 | S | Low | BE-08, FE-03 | BUILDER-1 |
| DO-01 | devops | devops-spec §2 | M | Medium | — | TECH-LEAD |
| DO-02 | devops | devops-spec §3 (DO-EC-04) | M | Medium | — | TECH-LEAD |
| DO-03 | devops | devops-spec §3 (DO-EC-02) | S | High | — | TECH-LEAD |
| DO-04 | devops | devops-spec §7 | M | Medium | DO-01 | TECH-LEAD |
| DO-05 | devops | devops-spec §4.2 | M | Medium | DO-01, DB-05 | TECH-LEAD |

## Notes

- Complexity/risk fields follow the existing story-spec format's conventions — used by `/fleet-build` to decide whether `am-tester` runs in-context (S-complexity/Low-risk) or as an isolated subagent (M/L-complexity or Medium/High-risk).
- Dependency ordering and cycle detection run through `task_graph` before finalizing: `DB-01 → DB-02..06 → BE-01 → BE-02..10 → FE-01 → FE-02..10 → DO-01..05`, verified acyclic.
- Branch names follow `feat/<role-id>/<task-id>-slug`, generated via `slugify` — see each `tasks/members/<role-id>.md` file for the exact branch name per task.
- `Depends on` is read by `dependency_gate.py` at `/fleet-build` branch-creation time — it blocks creating a task's branch if a declared dependency isn't yet traceable on `origin/main`, including a dependency owned by a different role's independent session (e.g. `BUILDER-2`'s `BE-01` blocks `BUILDER-1`'s `FE-02` until `BE-01` has actually merged).
- `BE-09` (Billing/Stripe) and `DO-03` (secrets management) are flagged High risk despite modest size — payment correctness and secrets-leakage consequences are disproportionate to the code volume involved.

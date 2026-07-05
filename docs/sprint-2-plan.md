# Bricky Sprint 2 Plan

Updated: 2026-07-05

## Objective

Turn the Sprint 1 release candidate into a maintainable pre-production foundation by removing duplicate business logic, freezing canonical contracts, and preparing safe database and deployment work.

## Current Branch

```text
codex/sprint-2-foundation
```

Base: Sprint 1 documentation head `abbfe2f` and release-candidate code commit `9a638a54811fe75d925071459901b3dba23f69bc`.

## Workstreams

### 1. Calculator consolidation

- DONE: remove the worker-profile `PRICE_TABLE` and manual labor-per-square-meter calculation.
- DONE: use the shared 15-category repair catalog and v0.2 pricing engine.
- DONE: expose category activities, approximate scope, exact area where relevant, and only `labor_only` / `labor_plus_materials`.
- DONE: show expected, labor, material, and possible EUR ranges with warnings and disclaimer.
- DONE: add source-level regression checks to the pricing verifier.
- VERIFIED: pricing verifier passes for 97 activities and 174 material items.
- VERIFIED: frontend production build passes.
- VERIFIED in the mock browser: 12 sq.m tile work changes from `420-660 EUR` labor-only to `520-880 EUR` labor plus materials, with `100-220 EUR` materials.

### 2. Canonical data model

- DONE as proposed contract: `users.id` is the canonical authenticated actor identifier.
- DONE as proposed contract: request state transitions and machine-readable status values are specified.
- DONE as proposed contract: stable repair category/activity keys are required.
- DONE as proposed contract: normalized applications, media, completed-job portfolio, review uniqueness, audit events, moderation, and address privacy are specified.
- DONE as proposed contract: immutable calculator snapshot storage is specified.
- DONE: ERD, transaction boundaries, compatibility exit gates, required indexes, and technical approval questions are documented in `docs/sprint-2-canonical-data-model.md`.
- DONE: add `scripts/db-sprint2-preflight.sql`, a read-only schema/row/orphan/status inventory for restored or staging databases.
- NEXT: technical approval and field-by-field mapping to versioned migrations.

### 3. Migration and database rehearsal

- DONE for additive Phase 1: build versioned forward and rollback migrations for canonical request fields, activities, calculation snapshots, and events.
- DONE: document field-by-field current-to-target mapping in `docs/sprint-2-migration-mapping.md`.
- DONE: add a minimal production-like legacy schema fixture and automated MySQL 8.4 UP/idempotency/DOWN rehearsal.
- DONE: add migration static safety/contract checks to the main verification gate.
- IN PROGRESS: run the MySQL rehearsal in GitHub Actions.
- NEXT: restore an actual production backup into an isolated schema and run preflight plus rehearsal against it.
- NEXT: produce reviewed row-count and orphan reports from the restored dump.
- Do not reset or clean production before explicit approval and a verified restore test.

### 4. Release foundation

- Keep the existing build/test gate mandatory.
- CI now runs on all `codex/sprint-*` branches and pull requests to `main`.
- Add isolated MySQL integration, migration rehearsal, browser E2E, and post-deploy smoke gates.
- Establish staging with production-like persistent media storage.

## Definition Of Done

Sprint 2 is complete only when:

1. no duplicate calculator business logic remains;
2. canonical identity, request, media, category, status, and pricing-snapshot contracts are approved and documented;
3. migrations and rollback pass against a restored production-like database;
4. request lifecycle integration/E2E tests pass with real multipart media;
5. staging deployment and rollback are demonstrated;
6. production cleanup, if approved, has a backup, rehearsal, and audit report;
7. the complete verification gate is green in GitHub Actions.

## Explicit Non-Goals Until P0 Is Green

- real payment-provider integration;
- paid credits or subscriptions;
- recommendation/ranking algorithms;
- AI-only moderation decisions;
- destructive production database reset without separate approval.

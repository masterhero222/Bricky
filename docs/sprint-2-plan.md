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

- Decide one canonical actor identifier (`users.id` is the current candidate).
- Freeze request state transitions and machine-readable status values.
- Freeze stable repair category/activity keys.
- Define normalized request applications, media, completed-job history, review uniqueness, moderation, and address privacy.
- Define the immutable calculator snapshot stored with each request.
- Produce an ERD and migration acceptance checklist before editing production data.

### 3. Migration and database rehearsal

- Build versioned forward and rollback migrations.
- Restore a production backup into an isolated schema.
- Rehearse migration, backfill, constraint validation, and rollback.
- Produce row-count and orphan reports.
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

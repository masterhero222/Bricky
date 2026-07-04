# Sprint 1 - Request Stabilization

Window: 2026-07-04 through 2026-07-11

Branch: `codex/sprint-1-request-stabilization`

## Goal

Prove the Bricky request lifecycle from client creation through worker application, assignment, completion, history, review, and logout without relying only on mock/localStorage behavior.

## In Scope

1. Real request service/controller tests and authorization failures.
2. Canonical actor, category, state, application, media, estimate, and location contracts.
3. A repeatable frontend/backend verification gate.
4. A guarded isolated-MySQL lifecycle E2E test.
5. A recorded local/staging smoke scenario including real before/after uploads, map visibility, portfolio grouping, review, and responsive logout.

## Out of Scope

- payments, plans, and credits;
- broad UI redesign;
- complete production database cleanup;
- final media/object-storage migration;
- advanced moderation;
- new map provider.

## Definition of Done

- [x] Frontend pricing verification passes: 97 activities and 174 material items.
- [x] Frontend production build passes.
- [x] Backend production build passes.
- [x] Backend Jest passes with real request and worker-history tests: 4 suites and 23 tests.
- [x] Request lifecycle unit success and critical role/ownership failures are covered.
- [x] Duplicate application behavior is deterministic and tested.
- [x] Canonical identity, state, category, application, media, estimate, and location contracts are documented.
- [x] `npm run verify:sprint1` is implemented and passes.
- [x] Isolated MySQL E2E passes: 1 suite and 8 tests.
- [x] E2E safety guards reject non-test or non-`sprint1` databases.
- [x] Temporary MySQL database/users are removed after the recorded run.
- [x] No production credentials or personal data are committed.
- [x] Real multipart before/after upload, HTTP serving, ownership rejection, and deletion are covered at API level.
- [ ] Uploaded before/after photos are visually rendered in the final browser smoke run.
- [x] A coordinate-bearing request is selected on the worker map and the detail panel changes to the correct request with photos.
- [x] A completed mock request is verified as one portfolio/history object with before/after media.
- [x] Responsive mobile worker logout is verified at `390x844`; it opens `/auth` after clearing the session.
- [x] Final requirement-by-requirement audit is recorded and remaining work is moved to Sprint 2/P0 honestly.

## Evidence

### Repeatable gate

```powershell
npm run verify:sprint1
```

Result on 2026-07-05: PASS, including 4 backend suites and 23 tests.

The gate runs:

- frontend pricing verification;
- frontend production build;
- backend production build;
- backend unit tests.

### Database-backed lifecycle

`backend/test/app.e2e-spec.ts` runs only when:

- `NODE_ENV=test`;
- `DB_NAME` contains `sprint1`;
- database variables point to an isolated schema.

Result on 2026-07-04: PASS, 8/8.

Covered:

- client and two worker registrations/logins;
- worker rejected from client-only request creation;
- request category, coordinates, and estimate;
- real multipart before upload, static retrieval, database metadata, ownership, and physical deletion;
- client ownership and worker feed/map visibility;
- first and duplicate application;
- owning-client assignment;
- rejection of non-assigned worker completion;
- assigned-worker multipart after upload, static retrieval, completion, and history;
- one review, duplicate rejection, and public rating.

The run used a fresh `bricky_sprint1_*` schema over an SSH tunnel. Temporary schema/users and local E2E files were removed afterward. Frontend visual rendering remains part of the final browser smoke.

## Known Finding Fixed

MySQL `simple-array` hydration returned legacy `appliedWorkers` as strings after persistence. The response hydration path now guarantees `number[]`, matching the canonical external actor-id contract.

Worker history previously read only legacy JSON media columns while new uploads were stored in `request_images`. History now hydrates all completed requests from `request_images` with one batched query, preserving legacy fallbacks and avoiding an N+1 query pattern. This restores before/after media for worker history and public portfolio albums.

## Final Audit And Sprint 2/P0 Carry-over

The 2026-07-05 verification gate passed after the media/history fix: pricing `97/174`, frontend build, backend build, and backend Jest `23/23`.

Sprint 1 has strong automated proof for the lifecycle and real multipart media API, but the following deployment-facing evidence remains mandatory before production sign-off:

1. Render API-uploaded before and after files in the client request, worker request, completed history, and public portfolio views.
2. Repeat media retrieval after a backend restart/deployment to prove persistent storage configuration, not only same-process serving.

These are P0 validation tasks. They do not invalidate the passing API E2E, authorization, pricing, build, and responsive logout evidence, but they prevent claiming a full production-ready visual smoke pass.

## Remaining Execution Order

1. Verify real API-uploaded before/after photos visually against staging.
2. Restart/redeploy the staging backend and verify the same media remains retrievable.
3. Run `npm run verify:sprint1` again after any staging-driven correction.
4. Perform the final Sprint audit and classify every remaining item for Sprint 2/P0.

## References

- `docs/sprint-1-canonical-contracts.md`
- `docs/sprint-1-smoke-checklist.md`
- `docs/next-session-todo.md`
- `backend/src/requests/requests.service.ts`
- `backend/test/app.e2e-spec.ts`

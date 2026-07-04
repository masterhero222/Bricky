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
- [x] Backend Jest passes with real request tests: 3 suites and 20 tests.
- [x] Request lifecycle unit success and critical role/ownership failures are covered.
- [x] Duplicate application behavior is deterministic and tested.
- [x] Canonical identity, state, category, application, media, estimate, and location contracts are documented.
- [x] `npm run verify:sprint1` is implemented and passes.
- [x] Isolated MySQL E2E passes: 1 suite and 7 tests.
- [x] E2E safety guards reject non-test or non-`sprint1` databases.
- [x] Temporary MySQL database/users are removed after the recorded run.
- [x] No production credentials or personal data are committed.
- [ ] Real multipart before-photo upload is exercised and rendered.
- [ ] Real multipart after-photo upload is exercised and rendered.
- [ ] The created coordinate-bearing request is verified on the worker map.
- [ ] Completed request is verified as one portfolio/history object with before/after media.
- [ ] Responsive mobile menu/logout is verified in the same final smoke run.
- [ ] Final requirement-by-requirement audit is recorded and remaining work is moved to Sprint 2/P0 honestly.

## Evidence

### Repeatable gate

```powershell
npm run verify:sprint1
```

Result on 2026-07-04: PASS.

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

Result on 2026-07-04: PASS, 7/7.

Covered:

- client and two worker registrations/logins;
- worker rejected from client-only request creation;
- request category, coordinates, estimate, and before-image metadata;
- client ownership and worker feed/map visibility;
- first and duplicate application;
- owning-client assignment;
- rejection of non-assigned worker completion;
- assigned-worker completion and history;
- one review, duplicate rejection, and public rating.

The run used a fresh `bricky_sprint1_*` schema over an SSH tunnel. Temporary schema/users were removed afterward. It did not transfer real multipart files, so media upload remains open.

## Known Finding Fixed

MySQL `simple-array` hydration returned legacy `appliedWorkers` as strings after persistence. The response hydration path now guarantees `number[]`, matching the canonical external actor-id contract.

## Remaining Execution Order

1. Add or exercise real multipart request-media endpoints in an isolated/staging lifecycle.
2. Verify file retrieval and deletion plus missing-file behavior.
3. Verify map selection for the newly created request.
4. Verify completed history/portfolio grouping.
5. Repeat responsive logout in the same run.
6. Run `npm run verify:sprint1` again.
7. Perform the final Sprint audit and classify every remaining item for Sprint 2/P0.

## References

- `docs/sprint-1-canonical-contracts.md`
- `docs/sprint-1-smoke-checklist.md`
- `docs/next-session-todo.md`
- `backend/src/requests/requests.service.ts`
- `backend/test/app.e2e-spec.ts`

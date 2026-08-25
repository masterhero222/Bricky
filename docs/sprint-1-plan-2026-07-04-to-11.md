# Bricky Sprint 1 - Request Lifecycle Stabilization

Period: 2026-07-04 to 2026-07-11

Status: ACTIVE

## Sprint Goal

Deliver a testable and documented request lifecycle foundation:

```text
client creates request
-> worker sees and applies
-> client assigns worker
-> worker completes request
-> client reviews completed work
```

Sprint 1 is successful only when this flow is verified through automated backend tests and a repeatable smoke procedure. UI appearance alone is not completion evidence.

## Scope

### S1.1 Request backend tests

- Replace the two empty/failing request spec files.
- Cover request creation by a client.
- Reject request creation by a worker.
- Cover client request ownership.
- Cover worker feed visibility.
- Cover first application and duplicate application behavior.
- Cover assignment by the owning client.
- Reject assignment by another client.
- Cover unassignment rules.
- Cover completion by the assigned worker.
- Reject completion by another worker.
- Cover completed worker history.
- Cover before/after image hydration where supported.

### S1.2 Canonical contracts

Document and enforce the Sprint 1 choices for:

- actor id: external request APIs use `users.id`;
- worker profile id remains internal profile identity;
- repair categories use stable `categoryKey` values;
- display labels are not identifiers;
- request transitions use a documented state machine;
- request applications use `request_applications` as the target source of truth;
- request media uses `request_images` as the target source of truth;
- legacy arrays/JSON remain compatibility-only until a later migration removes them.

### S1.3 Build and test gate

The repeatable Sprint 1 gate must run:

```powershell
cd frontend
npm run test:pricing
npm run build

cd ../backend
npm run build
npm test -- --runInBand
```

The gate must fail when any required command fails.

### S1.4 Smoke checklist

Document a non-destructive local/staging smoke test for:

- client login;
- worker login;
- client request creation with category, address, estimate, and photo;
- worker feed and map visibility;
- application;
- assignment;
- completion with after photo;
- history/portfolio visibility;
- review submission;
- logout on desktop and mobile.

Production mutation is not required for every development check. Use local/staging test data unless a production test is explicitly approved.

## Out of Scope

The following remain important but are not Sprint 1 deliverables:

- real payments;
- plans and credits;
- broad UI redesign;
- advanced AI moderation;
- production pricing administration;
- full media storage migration;
- complete database cleanup/reset;
- messaging system;
- map provider replacement.

Sprint 1 may document dependencies for these areas, but must not lose focus by implementing them prematurely.

## Daily Execution Plan

### July 4

- Freeze scope and Definition of Done.
- Record current failing test baseline.
- Map request controller/service behavior to required tests.

### July 5

- Replace empty request service tests.
- Cover create, list, apply, and duplicate apply.

### July 6

- Cover assign, unassign, complete, and authorization failures.
- Cover applications/images compatibility behavior.

### July 7

- Replace empty request controller tests.
- Verify guards, role checks, DTO validation boundaries, and route contracts.

### July 8

- Write canonical identity, category, media, and request-state contracts.
- Align code where a small safe correction is required by the contracts.

### July 9

- Add the repeatable Sprint 1 verification command/script.
- Add local/staging smoke checklist.
- Run the full gate from a clean install state where practical.

### July 10

- Fix regressions.
- Run the complete request lifecycle smoke test.
- Review remaining risks against the technical-director handoff.

### July 11

- Final requirement-by-requirement completion audit.
- Record command outputs and unresolved follow-ups.
- Mark Sprint 1 complete only if every Definition of Done item has evidence.

## Definition of Done

Sprint 1 is complete when all statements below are true:

- [x] Frontend pricing verification passes.
- [x] Frontend production build passes.
- [x] Backend production build passes.
- [x] Backend Jest run passes with real request tests.
- [x] Request lifecycle unit success paths are covered.
- [x] Critical controller/service role and ownership failures are covered.
- [x] Duplicate application behavior is deterministic and unit tested.
- [x] Canonical identity contract is documented.
- [x] Request state machine is documented.
- [x] Category and media source-of-truth transition is documented.
- [x] Repeatable verification command is implemented and passes.
- [ ] Local/staging smoke checklist is documented and executed.
- [ ] No real credentials or production personal data are added to Git.
- [ ] Remaining work is moved to Sprint 2/P0 backlog without being misrepresented as complete.

## Current Baseline Evidence

Initial baseline verified on 2026-07-04:

- frontend pricing test: PASS, 97 activities and 174 material items;
- frontend build: PASS;
- backend request test suites initially failed because two spec files contained no tests;
- production request-v2 routes and database tables are deployed;
- production request model remains transitional and dual-writes legacy/new structures.

Sprint progress on 2026-07-04:

- replaced both empty request spec files with tests against the real current service/controller;
- backend Jest: PASS, 3 suites and 20 tests;
- backend production build: PASS;
- covered create, client ownership, worker feed query, duplicate apply, assign ownership/application requirements, completion ownership/photos, controller role checks, map actor context, and request route arguments;
- database-backed integration and browser E2E coverage are still required before Sprint completion.

Additional progress on 2026-07-04:

- added `docs/sprint-1-canonical-contracts.md` on the Sprint branch;
- fixed canonical external actor identity to `users.id` and documented worker-profile id boundaries;
- documented target request state machine and transition authorization matrix;
- documented `request_applications` and `request_images` as target sources of truth with compatibility exit criteria;
- added cross-platform `npm run verify:sprint1` gate;
- the gate passes frontend pricing, frontend build, backend build, and all 20 backend tests;
- added `docs/sprint-1-smoke-checklist.md`;
- local mock lifecycle partially passed from request creation through application, assignment, completion, review, and logout;
- real before/after file upload, map visibility, portfolio grouping, and database-backed staging smoke remain required.

## Primary References

- `docs/before-production-technical-director-handoff-2026-07-04.md`
- `docs/next-session-todo.md`
- `docs/database-systems-audit.md`
- `docs/calculator-mock-pricing-v0.2.md`
- `backend/src/requests/requests.controller.ts`
- `backend/src/requests/requests.service.ts`
- `backend/src/requests/entities/`

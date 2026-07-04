# Sprint 1 Request Lifecycle Smoke Checklist

Updated: 2026-07-05

Use local mock or staging data. Do not create production accounts or requests unless the production mutation is explicitly approved.

## Preconditions

- Run `npm install` in `frontend` and `backend`.
- Run `npm run verify:sprint1` from repository root.
- Start local frontend with `npm run dev`.
- Use one consistent origin, for example `http://127.0.0.1:5173`.
- Reset the mock database from `Dev test` before the scenario.
- Record the origin and seeded client/worker ids.

## Scenario A - Client Creates Request

- [ ] Enter as mock client.
- [ ] Open `Направи заявка`.
- [ ] Select a stable repair category.
- [ ] Select at least one activity.
- [ ] Move backward one step and confirm the previous answer is retained.
- [ ] Move forward and enter a valid activity-specific quantity.
- [ ] Select `Труд` or `Труд + материали`.
- [ ] Confirm an expected EUR range is displayed separately from description.
- [ ] Enter an exact address or use browser location when intentionally permitted.
- [ ] Attach at least one before/problem photo.
- [ ] Submit the request.
- [ ] Confirm it appears in the client list with category, address, estimate, and photo.

Expected data invariants:

- request belongs to current client user id;
- request has stable `categoryKey`;
- price is structured, not appended to free-form description;
- before photo is preserved;
- initial request is open and unassigned.

## Scenario B - Worker Sees and Applies

- [ ] Switch to mock worker.
- [ ] Confirm the request appears in the worker feed.
- [ ] Confirm the same request appears on the worker-only map when coordinates exist.
- [ ] Open/select the request and confirm client photo is visible.
- [ ] Apply once.
- [ ] Attempt to apply again.
- [ ] Confirm no duplicate candidate is created and UI remains stable.

Expected data invariants:

- candidate uses worker `users.id`;
- one logical application exists per request/worker;
- request remains unassigned until the client chooses the worker.

## Scenario C - Client Assigns

- [ ] Switch back to the owning client.
- [ ] Open the request.
- [ ] Confirm the worker appears exactly once in candidates.
- [ ] Open the public worker profile.
- [ ] Return and assign the worker.
- [ ] Confirm selected worker and in-progress state are visible.

Expected data invariants:

- only owning client can assign;
- assigned id is worker `users.id`;
- assigned worker has an application;
- another client cannot mutate the request.

## Scenario D - Worker Completes

- [ ] Switch to the assigned worker.
- [ ] Confirm assigned request is visible.
- [ ] Attach at least one after photo.
- [ ] Complete the request.
- [ ] Confirm completed status, completion date, and duration.
- [ ] Confirm before/after images appear in completed history.
- [ ] Confirm completed object appears as one portfolio/history item, not unrelated loose photos.

Expected data invariants:

- only assigned worker can complete;
- completed worker id matches assigned worker id;
- duration is at least one day under current compatibility behavior;
- after photo belongs to request and uploader.

## Scenario E - Client Reviews

- [ ] Switch to the owning client.
- [ ] Confirm completed request is visible.
- [ ] Submit a rating from 1 to 5 and optional comment.
- [ ] Confirm the request shows as reviewed.
- [ ] Attempt a second review.
- [ ] Confirm duplicate review is rejected or disabled.
- [ ] Confirm public worker rating reflects the review.

Expected data invariants:

- one review per request/client;
- only owning client may review;
- only completed requests may be reviewed;
- reviewed worker id is the assigned worker user id.

## Scenario F - Session and Responsive Navigation

- [ ] Verify authenticated mobile menu has opaque background.
- [ ] Verify `Моят профил` is visible.
- [ ] Verify `Изход` is visible.
- [ ] Log out.
- [ ] Confirm token and role are cleared and login page opens.
- [ ] Repeat logout behavior on desktop/profile navigation.

## Failure Evidence To Capture

For every failed item record:

- actor role and user id;
- route and request id;
- expected vs actual state;
- browser console/network error;
- relevant mock DB fragment or staging row ids;
- screenshot when the defect is visual;
- whether reset/retry reproduces it.

## Execution Record

| Date | Environment/origin | Commit | Result | Evidence/notes |
| --- | --- | --- | --- | --- |
| 2026-07-04 | Local mock, `http://127.0.0.1:5173` | `codex/sprint-1-request-stabilization` | PARTIAL PASS | Created request #7 with `vik`, activity, labor+materials, quantity and exact test address; Back retained the selected activity; estimate displayed as 60-95 EUR; worker 201 saw and applied; duplicate apply became disabled/idempotent; owning client assigned worker 201; assigned worker completed; owning client submitted one 5-star review; review form disappeared after submission; logout returned to public auth actions. File upload and map visibility were not exercised in this run. |
| 2026-07-04 | Isolated MySQL over SSH tunnel | `codex/sprint-1-request-stabilization` | AUTOMATED PASS | Fresh temporary `bricky_sprint1_*` schema; 8/8 E2E tests passed registration/login, role rejection, request create, real before/after multipart upload and static serving, ownership rejection, physical image deletion, client ownership, worker feed/map, idempotent apply, assign, completion/history, one review, duplicate review rejection, and public rating. Temporary DB/users and local E2E files were removed. |
| 2026-07-04 | Local mock, responsive/browser audit | `edf1188` | PARTIAL PASS | Worker-only `/repair-map` loaded with a two-request cluster and a separate request marker. The map detail-panel state change could not be proved through the browser DOM harness. At `390x844`, authenticated worker navigation exposed `Изход`; activating it cleared the session and opened `/auth`. The gallery route loaded, but the active seed account did not contain enough completed before/after media to prove grouped portfolio rendering. |
| 2026-07-05 | Local mock, `http://127.0.0.1:5173` | `codex/sprint-1-request-stabilization` | VISUAL PASS | Reset seed provides one completed bathroom-renovation portfolio object with two before and two after images, address and six-day duration. The horizontal album card and four-image viewer rendered. Selecting map request `#3` changed the semantic detail panel from request `#1` to `#3`, including the matching address, description and two images. |
| 2026-07-05 | Local verification gate | `codex/sprint-1-request-stabilization` | AUTOMATED PASS | Pricing `97/174`, frontend build, backend build, and backend Jest `4 suites / 23 tests`. Worker history has a regression test proving one batched `request_images` query and correct before/after hydration with legacy fallback. |
| 2026-07-05 | Local restart storage smoke | `codex/sprint-1-request-stabilization` | AUTOMATED PASS | One absolute storage contract now covers request media, avatars, gallery files, deletion, and Nest static serving. A file remained retrievable from the same `/uploads/...` URL after closing the app and starting a new Nest instance. Full gate: `6 suites / 26 tests`. Guarded MySQL restart scenario is implemented but still requires a disposable Sprint 1 database to execute. |
| 2026-07-05 | Production HTTPS, read-only | `bricky.bg` | PREFLIGHT PASS | `/api/workers` returned `200`; a known `/api/uploads/workers/...jpg` returned `200 image/jpeg`. Direct `/uploads/...` returned the SPA HTML shell, confirming that production media must currently resolve through the `/api` proxy. No restart, upload, database mutation, or deploy was performed. |

## 2026-07-04 Findings

Passed:

- category/activity/quantity request wizard flow;
- backward navigation preserves selected activity;
- two-mode pricing choice and structured expected estimate;
- exact manual address fallback;
- request creation and client list presentation;
- worker feed visibility;
- application and duplicate-application UI behavior;
- owning-client assignment;
- assigned-worker completion;
- completed request review;
- duplicate review UI prevention after submission;
- logout session transition.
- worker-only map route and request clustering presentation;
- marker selection updates the matching request detail panel and photos;
- grouped completed-job portfolio card and four-image before/after viewer;
- responsive worker logout at `390x844`, including redirect to `/auth`.

Still required for a full smoke pass:

- visually render the API-uploaded before photo in the client and worker request views;
- visually render the API-uploaded after photo in completed history/portfolio;
- repeat multipart persistence after a backend restart/deployment on staging; the isolated E2E now covers upload, retrieval, ownership rejection, and physical deletion in one process.

## Automated MySQL Evidence

The guarded suite is `backend/test/app.e2e-spec.ts` and runs with:

```powershell
cd backend
npm run test:e2e
```

Required environment:

- `NODE_ENV=test`;
- `DB_NAME` contains `sprint1`;
- all normal `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` variables point to an isolated database;
- `TYPEORM_SYNCHRONIZE=true` is acceptable only for this disposable E2E schema;
- a non-production `JWT_SECRET` is set.

Never point this command at the production `bricky` schema. The test intentionally creates users, requests, applications, images, and reviews.

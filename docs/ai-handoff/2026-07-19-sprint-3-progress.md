# Sprint 3 Progress

Last updated: 2026-07-20

## Current Status

Sprint 3 is in progress. The v2 data foundation is present, but production readiness is not yet proven.

Estimated implementation progress: 95%.

The application layer is substantially implemented. Clean and synthetic legacy-v2 migration
rehearsals now pass on MySQL 8.4.10. The remaining risk is concentrated in rehearsal against a
restored production backup, end-to-end browser/API coverage and production deployment.

## Completed

- [x] V2 identity and profile entities:
  - `client_profiles`
  - `worker_profiles`
  - `worker_skills`
- [x] V2 request data entities:
  - `repair_requests`
  - `request_applications`
  - `request_events`
  - `request_pricing_snapshots`
- [x] Canonical `media_assets` model and VPS upload paths.
- [x] Worker avatar and gallery moderation foundation.
- [x] Request photo moderation foundation.
- [x] Registration writes v2 client/worker profiles.
- [x] Registration is atomic across user, profile, worker skills and referral attribution.
- [x] Referral attribution locks the open code during registration to prevent concurrent reuse.
- [x] Admin API foundation for users, workers, requests, media and audit.
- [x] Admin UI MVP.
- [x] Admin catalog and pricing management:
  - category and activity activation;
  - versioned pricing rule creation and activation;
  - super-admin mutation guards;
  - admin audit records for every mutation.
- [x] Immutable admin request timeline:
  - ordered lifecycle events;
  - actor, timestamp and metadata visibility;
  - pending/rejected request media remains available to admins.
- [x] Referral v1 data model, attribution, qualification and reward foundation.
- [x] Referral code creation and registration attribution are concurrency-safe:
  - code creation locks the canonical owner user;
  - registration revalidates owner status and role inside the transaction.
- [x] Worker referral qualification is triggered by canonical final request close.
- [x] Referral qualification and reward issuance run in one database transaction.
- [x] Referral reward issuance and extension are idempotent across lifecycle retries.
- [x] Referral qualification requires:
  - final `completed` lifecycle state;
  - client confirmation;
  - canonical worker close archive evidence;
  - active client, referred worker and referrer;
  - approved, visible worker profile;
  - approved request media where media exists;
  - distinct requests and distinct client accounts.
- [x] Approving the final pending request image safely rechecks referral qualification.
- [x] Shared extended referral rewards remain visible and manageable from admin detail.
- [x] Blog MVP for SEO.
- [x] Canonical request lifecycle state machine and unit tests.
- [x] Request DTO now exposes canonical lifecycle metadata:
  - `lifecycleStatusKey`
  - `statusLabel`
  - `nextActor`
  - `allowedActions`
- [x] Core request transitions are validated by `RequestLifecycleService`:
  - assignment
  - worker arrival
  - work start
  - work ready
  - client completion confirmation
  - client review
  - final worker close
- [x] The final lifecycle is split into explicit canonical states:
  - `client_confirmed`
  - `reviewed`
  - `completed`
- [x] Legacy worker steps remain ordered compatibility/evidence steps:
  - worker confirmation
  - inspection
  - ready-for-client signal
- [x] Assignment before admin approval is rejected.
- [x] Worker, client and repair-map actions use backend `allowedActions` with a temporary legacy fallback.
- [x] The mock API exposes the same lifecycle metadata as the backend.
- [x] Request DTO exposes canonical `applications`.
- [x] Request DTO exposes only canonical assignment/status fields:
  - `assignedWorkerUserId`
  - `statusKey`
  - `lifecycleStatusKey`
  - `statusLabel`
- [x] Active frontend screens no longer fall back to `assignedWorkerId`, `completedByWorkerId` or localized `status`.
- [x] Frontend request actions use backend `allowedActions` without status-based compatibility fallbacks.
- [x] Existing mock localStorage data is migrated once to the canonical assignment/status contract.
- [x] Active frontend and mock request flows use canonical application rows only.
- [x] `appliedWorkers` was removed from the v2 DTO and active UI fallbacks.
- [x] The unused legacy `RequestEntity` repository was removed from `RequestsService`.
- [x] The compatibility `/requests/worker/completed` route and dashboard fallbacks were removed.
- [x] Selecting a worker marks that application as `assigned` and the remaining applications as `rejected`.
- [x] Apply is idempotent and does not create duplicate lifecycle events.
- [x] Apply, assignment and client completion confirmation use database transactions for their coupled writes.
- [x] Suspended and unapproved workers are blocked from applying.
- [x] Worker can withdraw before selection and cannot withdraw after assignment.
- [x] Client can unassign before work starts.
- [x] Completed requests are archived from the active worker feed.
- [x] A reviewed request remains available to the assigned worker until final close.
- [x] Creating a review and advancing the request to `reviewed` run in one transaction.
- [x] Worker final close records archive actor, source and reason.
- [x] New request after-photos are stored as `pending`, not `approved`.
- [x] Public request DTOs hide pending and rejected media.
- [x] Client/admin and the assigned worker can inspect unapproved request media where required.
- [x] Shared-state media moderation regression proves:
  - a pending avatar does not replace the approved public avatar;
  - rejecting an avatar keeps the previous approved avatar;
  - approving an avatar retires the previous approved avatar;
  - pending gallery media is visible to its owner but not publicly;
  - approved gallery media becomes public after admin moderation.
- [x] Mock after-photo uploads now follow the production moderation contract:
  - new request after-photos are `pending`;
  - they are not copied into the public worker gallery;
  - public completed-project albums use approved media only.
- [x] Public worker completed-project history now reads canonical `repair_requests + media_assets`.
- [x] Public completed-project history hides exact addresses and unapproved media.
- [x] Worker dashboard prefers the canonical request-history endpoint over the legacy fallback.
- [x] Shared-state integration regression covers the complete canonical request flow:
  - client creates;
  - admin publishes and approves before-media;
  - worker applies;
  - client assigns;
  - worker confirms, arrives, inspects, starts and finishes;
  - worker after-media remains pending;
  - client confirms;
  - client reviews;
  - worker closes the request.
- [x] Final worker close is irreversible through the review endpoint.
- [x] Worker profile page refactor started:
  - sidebar extracted to `WorkerProfileSidebar`
  - dashboard summary extracted to `WorkerDashboardSummary`
  - calculator extracted to `WorkerCalculatorPanel`
  - referral section extracted to `WorkerReferralPanel`
  - gallery and media viewer extracted to `WorkerGalleryPanel`
  - parent reduced from about 1900 to about 1300 physical lines
- [x] Restricted worker dashboard states are presented as approval/visibility guidance
  instead of a technical request-loading error.
- [x] Sprint 3 core SQL migration aligned with the active entities:
  - complete request lifecycle enum with `pending_admin` default
  - request completion and archive metadata
  - worker profile banner key
  - catalog `is_active` column names
  - pricing, review, notification and snapshot column contracts
- [x] Idempotent alignment migration added for databases that already ran the older Sprint 3 SQL.
- [x] Static migration contract tests protect lifecycle states, archive fields, indexes and non-destructive SQL rules.

## Partially Complete

- [ ] Media moderation:
  - pending/rejected/approved states exist;
  - avatar replacement behavior is covered;
  - public request DTOs expose only approved media;
  - newly uploaded after-photos are pending;
  - service and shared-state request/gallery/avatar regression tests pass;
  - a production-like browser/API moderation rehearsal is still required.
- [x] Admin backoffice:
  - users, workers, requests, media, referrals and audit;
  - category and activity management;
  - versioned pricing management;
  - detailed immutable request timeline.
- [ ] Worker profile:
  - public view and banner customization exist;
  - sidebar, dashboard summary, calculator, referrals and gallery are extracted;
  - request list/history and editor sections still need further extraction.
- [x] Frontend request-creation cleanup:
  - the full frontend ESLint and production build pass;
  - unused duplicate request-creation state and handlers were removed from `ClientProfile.jsx`;
  - the canonical `RequestFlow` remains active in the create-request tab;
  - a client-profile browser regression loads that flow with no runtime errors.

## Not Yet Proven

- [x] Migration on a clean MySQL 8.4.10 database.
- [x] Migration upgrade rehearsal on a synthetic older v2 schema.
- [ ] Migration rehearsal on a restored production backup.
- [x] Static entity/SQL column and index audit.
- [x] Foreign-key and index verification against clean and synthetic legacy migrated schemas.
- [x] Registration transaction tests for client and worker:
  - both flows pass the same transaction manager through all writes;
  - duplicate email is rejected before opening a transaction;
  - profile failure prevents referral attribution and rolls back the transaction.
- [x] Full service-level request flow test:
  - client creates;
  - admin approves;
  - worker applies;
  - client assigns;
  - worker arrives;
  - worker starts;
  - worker marks ready;
  - client confirms;
  - client reviews.
  - worker closes the reviewed request.
- [ ] Full browser/API flow against a migrated database.
- [x] Review-once service integration test.
- [x] Referral edge-case and idempotency tests:
  - one request cannot count twice;
  - two requests from one client do not reward;
  - pending media blocks qualification;
  - invalid lifecycle/archive evidence blocks qualification;
  - suspended, hidden and unapproved workers do not qualify;
  - two distinct clients issue exactly one reward;
  - retries do not extend the reward again;
  - a second valid referral extends the active reward exactly once.
- [ ] Production deployment and smoke test of the complete Sprint 3 flow.

## Closed Referral Reliability Risks

- [x] Qualification no longer runs from the intermediate review state.
- [x] Qualification and reward issuance are atomic.
- [x] Reprocessing an already rewarded referral leaves the reward unchanged.
- [x] Client confirmation, worker approval/visibility and request media moderation are enforced.

## Database Migration Readiness

The SQL migration is statically and operationally aligned with the active TypeORM request model.

- `20260718_sprint3_v2_data_core.sql` now creates the corrected clean schema.
- `20260719_sprint3_v2_schema_alignment.sql` upgrades a database that already ran the older SQL.
- A Jest contract test checks the lifecycle enum, archive fields, catalog fields, indexes and
  absence of destructive SQL operations.
- `npm run migration:rehearse:sprint3` applies both migrations twice and validates the resulting
  tables, foreign keys, indexes, lifecycle enum and seeded categories.
- Clean and synthetic legacy-v2 rehearsals pass on MySQL 8.4.10 with:
  - 21 tables;
  - 31 foreign keys;
  - 78 indexes;
  - 15 seeded categories;
  - no missing expected schema objects.

The remaining database blocker is a rehearsal against a restored production backup. No production
migration should run before a fresh database and uploads backup exists.

## Next Work Order

1. Take fresh production database and uploads backups.
2. Rehearse both SQL files on a restored production backup.
3. Run the complete browser/API flow against the migrated database.
4. Verify media moderation and restricted-worker behavior through the public API.
5. Finish extracting the request/history and editor sections from `WorkerProfile.jsx`.
6. Address frontend bundle code splitting after the release-critical flow is proven.

## Verification On 2026-07-20

- `backend`: `npm run build` passed.
- `backend`: `npm test -- --runInBand` passed.
- Result: 15 suites, 105 tests passed.
- MySQL 8.4.10 clean migration and idempotent rerun passed.
- MySQL 8.4.10 synthetic legacy-v2 upgrade and idempotent rerun passed.
- Both schemas validated at 21 tables, 31 foreign keys, 78 indexes and 15 categories.
- `frontend`: `npm run build` passed.
- `frontend`: full `npm run lint` passed.
- `frontend`: scoped ESLint for the admin/catalog mock changes passed.
- `frontend`: scoped ESLint for `WorkerProfile` and all extracted profile components passed.
- Dev browser regression passed for:
  - category activation and restoration;
  - pricing rule creation;
  - request creation, admin publication and immutable timeline inspection.
- Dev browser regression passed for the extracted worker profile sections, calculator behavior
  and the restricted-worker dashboard state with no frontend runtime errors.
- Dev browser regression passed for client login, the client profile and its canonical
  create-request flow with no frontend runtime errors.
- The dev browser regression used the local mock contract, not a migrated MySQL database.
- Remaining build warning: the main frontend bundle is larger than 500 kB and needs later code splitting.
- Remaining dependency warnings: stale Browserslist and Baseline browser data.

## Sprint 3 Release Gate

Sprint 3 can be marked stable only when all items below pass:

- [x] SQL migration statically matches the current entities.
- [x] Clean database migration succeeds.
- [ ] Restored production database migration succeeds.
- [x] Complete client/admin/worker service flow succeeds automatically.
- [ ] Complete client/admin/worker browser/API flow succeeds on the deployed stack.
- [ ] Media pending/approve/reject behavior succeeds for avatars, galleries and requests.
- [ ] Suspended/unapproved worker restrictions succeed through the public API.
- [x] Referral qualification and 30-day reward issuance are atomic, idempotent and covered by tests.
- [x] Backend tests and frontend build pass.
- [ ] Production smoke test passes.
- [ ] Fresh database and uploads backups exist before deployment.

## Safety Notes

- Legacy tables remain read-only/archive.
- Do not run destructive cleanup on production.
- Take fresh database and uploads backups before migration rehearsal.
- Do not enable TypeORM synchronize in production.
- Do not deploy Sprint 3 as complete until the full flow and migration checks above pass.

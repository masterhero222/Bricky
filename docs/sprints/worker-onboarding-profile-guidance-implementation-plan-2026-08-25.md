# Bricky Worker Onboarding, Profile Guidance And Admin Contact Plan

Date: 2026-08-25  
Target branch: `codex/sprint-3-integration`  
Inspected commit: `dce0094e8deb5f9da30e3dccb6686f24222b1b3d`

## Scope

This plan implements the attached product brief without replacing the current
worker registration, profile, moderation, gallery, category, or admin systems.
All database changes are additive. No production deployment is included.

## Root Cause

The worker registration form already collects a phone number. The backend maps
it to `worker_profiles.phone_private` through `AuthService` and
`WorkersService.createWorkerProfile()`.

The admin worker endpoint currently reuses the public worker summary serializer.
That serializer intentionally removes private fields such as phone, email, and
address. `WorkersService.getAllForAdmin()` adds the email back, but does not add
`phonePrivate`. This is why a stored phone can be missing in the admin panel.

The fix must not weaken the public serializer. Admin list and admin detail need
separate, explicitly private response DTOs.

## Existing Systems To Reuse

- `users` and `worker_profiles` for identity and worker profile data.
- `worker_skills` and the existing repair category keys for services.
- `media_assets` for moderated avatar and gallery images.
- `AccountSettingsPanel` and the account API for contact editing.
- Existing worker profile, appearance, avatar, gallery, and reorder endpoints.
- Existing admin guards, worker approval, suspension, and wall visibility actions.
- Existing admin modal/drawer interaction patterns.
- Existing SQL migration and Sprint 3 rehearsal/release scripts.

There is no confirmed production analytics event pipeline. This work will define
an event contract, but will not introduce an unrelated analytics SDK.

## P0: Admin Contact Visibility

### Backend

1. Add a dedicated admin worker list DTO containing operational fields only:
   `workerUserId`, public name, city, account status, approval status, visibility,
   onboarding status, completion percentage, missing item keys, and booleans such
   as `hasPhone`. The list must not expose the raw phone or address.
2. Add `GET /admin/workers/:workerUserId` for the protected detail view.
3. The detail DTO may include `phonePrivate`, account email, default address,
   onboarding answers, moderation summary, and profile completion details.
4. Keep `GET /workers` and `GET /workers/:workerUserId` unchanged and private-data
   free.
5. Normalize new phone values on write. Accept common Bulgarian input such as
   `08...` and store a normalized international form where possible. Preserve
   legacy `NULL` values and display them as missing rather than inventing data.
6. Do not put phone, email, or address in logs, audit metadata, analytics events,
   or public cache payloads.

### Frontend

1. Add a worker detail action to the existing admin workers table.
2. Open an in-page detail drawer/modal with phone, email, address, onboarding,
   completion, missing fields, and current account/moderation status.
3. Keep approval, suspension, and wall visibility actions in their existing flow.
4. Add loading, missing-data, forbidden, and retry states.

### P0 Files

- `backend/src/workers/workers.service.ts`
- `backend/src/admin/admin.controller.ts`
- `backend/src/admin/admin.service.ts`
- New DTOs under `backend/src/admin/dto/`
- `frontend/src/pages/AdminBackoffice.jsx`
- New focused admin worker detail component under `frontend/src/components/admin/`
- Relevant Jest specifications

P0 does not require a schema migration because `phone_private` and
`default_address` already exist.

## P1: Four-Step Worker Onboarding

### Data Model

Add one idempotent migration:

`backend/migrations/20260825_worker_onboarding_profile_guidance.sql`

Proposed nullable/additive fields on `worker_profiles`:

- `primary_category_key`
- `preferred_contact_method`
- `work_type`
- `experience_range`
- `availability_status`
- `acquisition_source_self_reported`
- `acquisition_source_detail`
- `onboarding_step`
- `onboarding_completed_at`
- `project_photos_readiness`
- `service_description_readiness`
- `contact_accuracy_confirmed`

Use stable English machine keys. Bulgarian labels remain in the frontend. Existing
`city` is the initial service area; this task will not create a new geography
system. `worker_skills` remains the canonical set of specialties, while
`primary_category_key` makes the main category explicit.

The migration must not backfill fake phone numbers, acquisition sources, photos,
or readiness answers. Existing workers receive an incomplete onboarding state and
can continue later.

### Backend Services And APIs

1. Add a central `WorkerProfileCompletionService`.
2. Calculate completion on read; do not persist a percentage that can become stale.
3. Count only approved avatar/gallery media because only approved media is visible
   to clients. Pending media is reported separately as awaiting moderation.
4. Return:
   - `percentage`
   - `score`
   - `missingItems[]` with stable keys, labels, points, and deep-link targets
   - `pendingModerationItems[]`
   - `onboardingStatus`
5. Add `GET /workers/me/onboarding` to return saved answers, current step, and the
   central completion result.
6. Add typed, idempotent step updates under
   `PUT /workers/me/onboarding/:stepKey`.
7. Include the same central guidance result in the authenticated worker profile
   response so dashboard, editor, and onboarding cannot disagree.
8. Validate enum values and ownership in the backend. Suspended or blocked users
   may view their saved data but cannot publish a profile or bypass moderation.

Implemented 100-point completion weights:

| Field | Points |
| --- | ---: |
| Public name | 10 |
| Valid private phone | 10 |
| City/service area | 10 |
| At least one specialty | 15 |
| Description | 10 |
| Approved avatar | 10 |
| At least one approved gallery image | 10 |
| At least three approved gallery images | 15 |
| Work type and availability | 5 |
| Acquisition and completed onboarding | 5 |

### Frontend

1. Add a four-step onboarding wizard that saves after every step and resumes from
   the last completed step.
2. Reuse account contact fields, existing category options, profile editor fields,
   avatar upload, gallery upload, and gallery ordering controls.
3. Add a compact profile guidance card to the worker dashboard with percentage,
   missing items, pending moderation state, and direct navigation to the relevant
   section.
4. Replace the local six-field percentage in
   `WorkerProfileEditorPremium.jsx` with the backend completion DTO.
5. Add admin filters for incomplete profiles, missing phone, and incomplete
   onboarding. Sorting and filtering should be supported by the API, not only by
   the currently loaded browser rows.
6. Update `devMockApi.js` only as a development adapter; it is not a source of
   production truth.

### P1 Files

- `backend/src/workers/worker-profile.entity.ts`
- `backend/src/workers/workers.controller.ts`
- `backend/src/workers/workers.service.ts`
- New onboarding DTOs and completion service under `backend/src/workers/`
- `backend/migrations/20260825_worker_onboarding_profile_guidance.sql`
- `frontend/src/pages/workers/WorkerProfile.jsx`
- `frontend/src/components/workers/WorkerProfileEditorPremium.jsx`
- `frontend/src/components/account/AccountSettingsPanel.jsx`
- New focused onboarding/guidance components
- `frontend/src/pages/AdminBackoffice.jsx`
- `frontend/src/services/devMockApi.js`

## Analytics Contract

Document these events for the future analytics pipeline without sending private
values:

- `worker_onboarding_started`
- `worker_onboarding_step_saved` with `step_key`
- `worker_onboarding_completed`
- `worker_profile_guidance_clicked` with `missing_item_key`
- `worker_profile_completion_changed` with percentage band only

Self-reported acquisition is stored separately from any future tracked UTM or
referral attribution. Phone, email, address, free text, and image URLs are never
event properties.

## Tests And Evidence

### Backend

- Registration still stores a supplied worker phone in `phone_private`.
- Public worker endpoints never return phone, email, or exact address.
- Admin list returns `hasPhone` but not the raw phone.
- Admin detail returns private contact only to admin/super-admin.
- Missing legacy phone remains `NULL` and is reported as missing.
- Each onboarding step validates, saves, and resumes correctly.
- Completion weights total 100 and use approved media only.
- Moderation approval/rejection changes completion on the next read.
- Suspended/blocked users cannot use onboarding to republish themselves.
- Migration runs on empty and legacy schemas and is safe to rerun.

### Frontend

- Admin opens worker detail and sees real/missing contact states.
- New worker completes all four steps and resumes after refresh/login.
- Guidance links open the correct profile section.
- Pending media does not appear as completed public-profile work.
- Desktop and mobile screenshots cover the wizard, worker guidance, admin list,
  and admin detail.
- Run backend Jest tests/build, frontend lint/build, and browser smoke checks.

## Commit Sequence

1. `fix(admin): expose worker contact through protected detail dto`
2. `feat(workers): add onboarding schema and central profile completion`
3. `feat(frontend): add worker onboarding and profile guidance`
4. `feat(admin): add onboarding filters and worker detail view`
5. `test(docs): cover privacy, migration, completion and acceptance evidence`

Each commit should be independently reviewable. Production deployment requires a
separate explicit approval after migration rehearsal and acceptance evidence.

## Risks And Controls

- Some real legacy workers may have no phone. Show `Липсва`; do not fabricate or
  silently copy another field.
- The current public and admin serializers are too closely coupled. Separate DTOs
  prevent a privacy regression.
- `WorkerProfile.jsx` and `AdminBackoffice.jsx` are already large. New UI should be
  extracted into focused components instead of increasing those files further.
- Pending/rejected media can make completion confusing. Count approved media only
  and show moderation status explicitly.
- There is no trustworthy `last_seen_at`. Do not label `users.updatedAt` as last
  activity. A throttled activity timestamp can be a separate future feature.
- Additive columns may remain after an application rollback. The old application
  will ignore them, which makes rollback safer than a destructive down migration.

## Definition Of Done

- Admin can find a worker, see whether contact exists, and open protected contact
  details without exposing that data publicly.
- New and legacy workers receive one consistent completion percentage and actionable
  guidance.
- The four-step onboarding saves and resumes reliably.
- Existing moderation, gallery ordering, registration, public profile, and admin
  approval flows continue to work.
- Tests, migration rehearsal, screenshots, and a short acceptance report are ready
  before any production deployment request.

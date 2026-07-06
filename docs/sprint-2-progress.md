# Bricky Sprint 2 Progress

## Controlled Lifecycle Completion Pass (2026-07-06)

The Sprint 2 definition of done was expanded after the original moderation gate. Sprint 3 remains blocked until the controlled lifecycle and unified media acceptance checks pass.

Implemented in the current branch:

- canonical request states: `approved`, `assigned`, `worker_arrived`, `in_progress`, `waiting_client_confirmation`, `client_confirmed`, `completed`, `disputed`, `canceled`;
- backend-validated transitions with no direct assigned-to-completed shortcut;
- worker actions for arrival, start, ready, and final close;
- at least one persisted completion image is required before `waiting_client_confirmation`;
- client confirmation and dispute actions;
- reviews remain restricted to completed, approved requests;
- request, gallery, and avatar uploads use the shared image pipeline: rotate, max 1920 px, WebP quality 75-82, max 1 MB output, and a separate WebP thumbnail;
- completion and other user media enter `pending_review` and public reads expose only approved media;
- additive migration `20260706_003_controlled_request_lifecycle_up.sql` and rollback script.

Automated evidence currently green:

- backend build;
- frontend build;
- 66 backend tests across 13 suites;
- mock moderation publication/suspension/reactivation verifier.

Still required before Sprint 2 can be marked complete:

- run the additive migration rehearsal against isolated MySQL;
- expand the real MySQL E2E from the legacy direct-completion flow to every new state;
- manually test the entire client/worker/admin flow in the mock browser;
- verify avatar and gallery compression using real large phone images;
- verify admin preview metadata and rejection reasons for every media type;
- staging acceptance and rollback rehearsal.

## Final Stabilization Pass (2026-07-07)

Sprint 2 remains **OPEN**. Current local evidence:

- `statusKey` is the canonical lifecycle field; legacy `status` remains synchronized for compatibility;
- one `RequestLifecycleService` validates every transition and rejects invalid jumps;
- assignment, ready, dispute, completion, and moderation rejection create persisted notifications;
- request, completion, gallery, and avatar uploads share one storage/processing pipeline;
- source uploads up to 25 MB are rotated, resized to max 1920 px, converted to WebP, limited to 1 MB output, and given a WebP thumbnail;
- request/gallery/avatar moderation shares one media policy service with audit and uploader notification;
- migration `003` is additive/idempotent and does not rewrite the legacy status enum;
- CI is configured to build the E2E database from versioned SQL with `TYPEORM_SYNCHRONIZE=false`;
- local verification passed: frontend/backend builds, migration contracts, pricing verification, mock moderation, and 81 tests across 16 suites.

Open release gates:

- GitHub MySQL 8.4 migration rehearsal and full lifecycle E2E for the current commit;
- supplied real phone-photo acceptance;
- isolated VPS staging deployment, three manual flows, restart persistence, and rollback rehearsal;
- PR review/merge and controlled production deployment;
- disposable production lifecycle and cleanup evidence.

Updated: 2026-07-06
Branch: `codex/sprint-2-foundation`
Verified Sprint 2 baseline commit: `02b6ee4`

## Sprint 2.1 Enforcement Update

The admin panel baseline is complete, but production readiness now includes a separate enforcement audit. Sprint 2.1 makes account suspension, request moderation, worker eligibility, request transitions, and review prerequisites authoritative in backend services rather than relying on frontend visibility.

Implemented locally:

- suspended existing JWT sessions are rejected by database status on every protected request;
- suspended workers and clients are blocked from their respective mutations;
- suspended/unapproved workers disappear from all audited public worker lookup paths;
- pending, rejected, and hidden requests cannot receive applications, assignment, completion, after-photos, or reviews;
- review creation requires an approved completed request and active participants;
- reactivation restores permissions without altering history;
- backend build and 63 unit tests pass across 13 suites.
- client map access, cross-role worker endpoints, hidden completed history, and pending public-media leakage are explicitly blocked.

The expanded MySQL lifecycle E2E suite passed in GitHub Actions run `28759468108` for commit `3c1f6bf`. See `docs/sprint-2-1-enforcement-layer.md`.

## Sprint Objective

Introduce a production-oriented moderation gate so user-generated requests, media, worker profiles, galleries, avatars, and reviews cannot become public before an administrator approves them.

## Completed

### Moderation model

- Request lifecycle and publication moderation are separate fields.
- Supported moderation states: `pending_review`, `approved`, `rejected`, and `hidden`.
- New requests, request images, worker content, and reviews enter moderation before public visibility.
- Existing production content is backfilled to `approved` once by the additive migration.

### Visibility rules

- Workers and the request map receive approved requests only.
- Public worker profiles, avatars, galleries, history media, and reviews expose approved content only.
- Owners retain access to their pending, rejected, and hidden content.
- Rejected requests show the moderation reason to the client.
- Clients can correct and resubmit rejected/hidden requests; they return to `pending_review`.

### Admin API and security

- `/api/admin` is protected by JWT authentication and a database-authoritative admin role guard.
- Public registration cannot create administrators.
- Suspended users cannot log in and already-issued JWT sessions stop working.
- Admin queues cover requests, request/gallery/avatar media, worker profiles, and reviews.
- Queue endpoints support status filtering, text search, pagination, and protected detail reads.
- Admin actions support approve, reject, hide, controlled request correction, spam deletion, user suspension, and reactivation.
- Reject, hide, edit, and delete actions require a reason at API level.

### Audit trail

Every administrative mutation records:

- administrator user ID;
- action and target type/ID;
- previous and new values;
- reason;
- request IP address;
- timestamp.

### Admin UI

- Protected `/admin` route and navigation entry.
- Operational counters for pending content, active/completed requests, users, and approved workers.
- Request, media, worker, and review queues.
- Search, status filtering, pagination, previews, and detail drawer.
- Approve, reject, hide, request correction, and spam deletion controls.
- Recent administrative activity summary.
- Searchable and paginated audit-log tab with action filters, reasons, IP addresses, and old/new values.
- Local mock administrator identity and moderation test data.

### Database rollout

- Additive/idempotent Sprint 2 migrations with rollback scripts.
- Moderation fields and indexes added without destructive reset.
- `admin_audit_logs` stores full moderation audit metadata.
- Migration rehearsal uses MySQL 8.4 in GitHub Actions.

## Verification Evidence

- Frontend production build: passed.
- Backend production build: passed.
- Backend unit tests: 41 passed across 11 suites.
- Pricing configuration verification: 97 activities and 174 material items passed.
- MySQL 8.4 migration rehearsal and lifecycle E2E: passed in GitHub Actions run `28752769918`.
- E2E covers rejection, owner correction/resubmission, approval, media visibility, administrative edit/delete, audit records, assignment, completion, and review approval.
- Manual mock smoke covered admin login, all queues, filters, protected request details with photos, approval, rejection through the in-page reason modal, and the resulting filtered audit record without browser-console errors.

## Current Risks And Technical Debt

- Request images, gallery images, and avatars still use separate persistence models; a canonical media asset model remains a later additive migration.
- A dedicated account-management view for suspension/reactivation is now implemented in the admin UI.
- Standard moderation reason presets are not implemented; free-text reasons work.
- Automated content scanning is not implemented and must never bypass human auditability.
- Production deployment still requires backup, migration rehearsal against a production copy, deploy, and smoke tests before enabling the gate publicly.
- Canonical media consolidation is specified in `docs/canonical-media-model-proposal.md` but intentionally excluded from the current moderation migration.

## Definition Of Done Audit

- [x] `/admin` exists and is protected in the frontend.
- [x] `/api/admin` endpoints require JWT plus a database-authoritative admin role.
- [x] Requests are reviewed before publishing.
- [x] Pending and rejected requests are absent from worker feed/map.
- [x] Approved requests are visible to workers.
- [x] Rejected requests remain visible to owner/admin with a correction reason and resubmission path.
- [x] Request before/after images, worker gallery images, avatars, and reviews require approval before public display.
- [x] Admin can approve, reject, and hide content and can edit/delete requests under controlled rules.
- [x] Every admin mutation writes an audit record with actor, target, old/new values, reason, IP, and timestamp.
- [x] Backend unit tests and MySQL lifecycle E2E cover moderation visibility boundaries.
- [x] Frontend mock smoke covers admin login, queues, approval, rejection with reason, request photos, and audit filtering.
- [x] Production schema changes are migration-only and `TYPEORM_SYNCHRONIZE` is forbidden in production.
- [x] Frontend has no direct database access and no raw SQL is exposed.
- [x] Payments, credits, subscriptions, messaging, and AI moderation were not added in this sprint.

Sprint 2 admin functionality and the Sprint 2.1 backend enforcement layer are code-complete with green local and MySQL CI verification. Production readiness still requires the staging acceptance gate and controlled deployment checklist.

## Next Sprint 2 Steps

1. Execute `docs/sprint-2-staging-deployment-checklist.md` against an isolated staging copy.
2. Implement canonical media consolidation only as a separately approved later migration.

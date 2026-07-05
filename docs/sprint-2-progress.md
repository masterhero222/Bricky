# Bricky Sprint 2 Progress

Updated: 2026-07-05  
Branch: `codex/sprint-2-foundation`  
Latest verified commit: `5543d2e`

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
- MySQL 8.4 migration rehearsal and lifecycle E2E: passed in GitHub Actions run `28747728127`.
- E2E covers rejection, owner correction/resubmission, approval, media visibility, administrative edit/delete, audit records, assignment, completion, and review approval.
- Manual mock smoke covered admin login, all queues, filters, details, and media approval without browser-console errors.

## Current Risks And Technical Debt

- Request images, gallery images, and avatars still use separate persistence models; a canonical media asset model remains a later additive migration.
- A dedicated account-management view for suspension/reactivation is now implemented in the admin UI.
- Standard moderation reason presets are not implemented; free-text reasons work.
- Automated content scanning is not implemented and must never bypass human auditability.
- Production deployment still requires backup, migration rehearsal against a production copy, deploy, and smoke tests before enabling the gate publicly.

## Next Sprint 2 Steps

1. Add a dedicated audit-log view with filters.
2. Prepare the canonical media model as a separate additive migration proposal; do not mix it into the current moderation rollout.
3. Produce and execute the production deployment checklist only after staging verification.

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

## Final Stabilization Evidence - 2026-07-07

- Release candidate SHA: `a0b7bb0b6700d7c9a45e122600a6e5c511c10222` on `codex/sprint-2-foundation`.
- GitHub Actions run `28828356248` passed, including MySQL 8.4 migration rehearsal, repeated UP, reverse DOWN, migration-created schema, and lifecycle E2E with `TYPEORM_SYNCHRONIZE=false`.
- Isolated VPS staging uses `/var/www/Bricky-staging`, database `bricky_sprint2_staging`, `/var/www/Bricky-staging-uploads`, PM2 process `bricky-staging`, and port `3100` restricted by firewall.
- A sanitized production backup was restored; migrations `001`, `002`, and `003` are recorded and no orphan request clients were found.
- Staging happy path passed through approved request, approved media, application, assignment, arrival, work start, completion media, client confirmation, close, review, and review approval.
- Reject/reason/resubmit/approve and dispute/blocked-completion flows passed.
- Existing JWT invalidation and reactivation passed for both worker and client accounts.
- Full and thumbnail WebP URLs remained available after a staging PM2 restart.
- Browser acceptance found and fixed the admin-login redirect; `/admin` now opens without console errors.

At this checkpoint Sprint 2 remained open; the continuation below records the browser and rollback gates completed afterward.

## Acceptance Continuation - 2026-07-07

- Current release candidate and staging SHA: `b8cbb09615d8b9b6ee361b12261ffae60d17f61f`.
- GitHub Actions run `28865620651` passed for that SHA.
- Desktop browser acceptance passed for admin, client, and worker profiles with no captured console errors.
- Client request history displayed the completed, disputed, and reject/resubmit staging records correctly.
- Worker dashboard displayed the approved worker feed and completed review data correctly.
- Mobile navigation and logout passed at 390x844. A fixed-sidebar horizontal overflow was found, fixed, and verified at `scrollWidth == clientWidth`.
- Disposable staging rollback rehearsal passed: reverse `003 -> 002 -> 001`, then forward `001 -> 002 -> 003`; row counts stayed `13:28:5:13` and all three migration records were restored.
- Direct staging firewall access was removed after acceptance; port `3100` is tunnel-only again.

Sprint 2 remains **OPEN** only for the missing original phone image over 10 MB and the subsequent PR/production gates.

## Next Sprint 2 Steps

1. Execute `docs/sprint-2-staging-deployment-checklist.md` against an isolated staging copy.
2. Implement canonical media consolidation only as a separately approved later migration.

## Production Release - 2026-07-07

- PR `#5` was reviewed through green CI and merged into `main`.
- Exact production SHA: `5a941fc6dd19c91685662a6e94d008130646d5c3`.
- The sanitized Sprint 2 mock/staging database was promoted to production by explicit owner instruction; there were no real users to preserve.
- A dedicated administrator account was created without recording its password in source control.
- Production backend, frontend, media storage, thumbnails, role logins, worker/request data, admin dashboard, and mobile admin layout passed smoke verification.
- Production backup: `/var/www/Bricky/backups/production_20260707_125029`.
- `TYPEORM_SYNCHRONIZE=false` is confirmed in the production PM2 environment.
- The unavailable original phone image over 10 MB remains an accepted P1 follow-up. Generated exact-size fixtures passed.

Sprint 2 is now released with the documented residual risk. No Sprint 3 marketplace or payment feature was added as part of this release.

## Account Verification And Recovery Pass - 2026-07-10

Implemented in the current release branch:

- email verification, resend verification, password reset request, and password reset endpoints;
- account token and email delivery-log persistence through additive migration `004`;
- JWT token-version enforcement so password reset and administrative session revocation invalidate existing tokens;
- verified-account guard on protected marketplace mutations;
- login now rejects accounts that still require email confirmation;
- login UI can resend the verification link when an account is not confirmed;
- verification resend and password reset token issuing are rate-limited to 3 attempts per user per 60 minutes;
- frontend routes for email verification, forgotten password, and password reset;
- backend `.env.example` documents the required mail provider variables without secrets;
- `docs/email-provider-smoke-checklist.md` defines the disposable-account SMTP acceptance flow;
- account settings now expose platform-news opt-in/opt-out for clients and workers;
- public single-use `news_unsubscribe` token consumption is implemented for future news emails;
- Bulgarian auth and account email copy was cleaned so production users do not see mojibake text;
- account-token/email-delivery retention cleanup is implemented in `AccountSecurityService` with a manual SQL runbook in `scripts/cleanup-account-security-data.sql`;
- account email delivery logs now capture provider message ids and provider failure details without storing raw verification/reset tokens.

Verified locally:

- frontend production build passes;
- backend production build passes;
- targeted account-security and auth service tests pass for rejected unverified login, successful verified login, and token-issue rate limiting.

Remaining before this account/email slice is production-complete:

- configure a real production mail provider with `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`, and `FRONTEND_URL`;
- consider adding IP-based throttling at the proxy/API edge for anonymous abuse patterns;
- implement the actual news-campaign sender later; Sprint 2 now only provides consent and unsubscribe plumbing;
- schedule or manually run the account-security cleanup after backup according to the documented retention policy;
- add retry handling for failed account email delivery if the selected provider does not handle retries externally;
- run a live SMTP smoke test with disposable accounts.

## Mock Registration P0 Fix - 2026-07-10

The local mock registration 500 was traced to the shared API router: `Register.jsx` already used `apiPost`, but `api.js` only routed auth requests to `devMockApi` when a mock token already existed. A first-time registration therefore fell through to the real backend and failed when the local backend/mail setup was unavailable.

Implemented in the current release branch:

- `/auth/register`, `/auth/login`, verification, resend, password-reset, and dev-login endpoints are mock-routed in dev mode without requiring a prior mock token;
- mock client registration creates `id`, `name`, `email`, `role`, `accountStatus`, `emailVerifiedAt`, `emailVerificationRequired`, `tokenVersion`, `createdAt`, and `created_at`;
- mock worker registration creates the user/account fields plus linked worker profile data with `userId`, profile `id`, skills, moderation state, gallery, and completed-job collections;
- old localStorage mock data is migrated safely with missing auth fields instead of requiring a manual reset;
- mock registration no longer auto-verifies email; it stores the account as pending verification and writes a mock `email_verification` message with a single-use token/link into `mockEmailOutbox`;
- mock resend creates a new verification message without account enumeration, and mock login remains blocked until `/auth/verify-email` consumes a valid token;
- the local `Dev test` panel now shows the latest mock verification emails and opens pending verification links for manual browser testing;
- mock mode still does not require real SMTP env vars; real provider delivery remains a backend/production configuration concern;
- `frontend/scripts/verify-mock-auth.mjs` covers client registration, worker registration, login blocked before verification, resend, token verification, login after verification, duplicate email rejection, suspended account rejection, and explicit unverified account rejection.

Verified locally:

- `frontend npm run test:mock-auth` passes;
- `frontend npm run build` passes.

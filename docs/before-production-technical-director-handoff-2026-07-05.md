# Bricky Technical Director Handoff and Before Production TODO

Updated: 2026-07-05 (Sprint 1 release-candidate evidence and complete Before Production backlog reconciled)

## Purpose

This is the current canonical technical handoff for Bricky. It is intended for an AI or human technical director who will restructure the work into an executable pre-production plan.

The document combines:

- the real implementation currently in the repository and live server;
- the production deployments completed through 2026-07-01 and the newer, not-yet-deployed Sprint 1 release candidate;
- the complete backlog from `docs/next-session-todo.md`;
- the database audit, mock documentation, calculator plan, map plan, business plan, and payment direction;
- newly verified build, test, architecture, and security findings.

Status terms:

- `LIVE`: deployed on `bricky.bg`.
- `MOCK`: implemented only in the local Vite/localStorage environment or validated mainly there.
- `TRANSITIONAL`: present in production, but still coexists with legacy fields or behavior.
- `BLOCKER`: must be resolved before a controlled public launch.
- `LATER`: intentionally deferred until the core platform is stable.

## Executive Summary

Bricky is a two-sided repair marketplace:

- clients create repair requests, upload photos, receive an approximate price, review applicants, assign a worker, and rate completed work;
- workers maintain public profiles and portfolios, browse requests in a feed or map, apply, complete work, and build verified Bricky history;
- the planned business model charges workers for access, applications, visibility, and professional tools; clients remain free initially.

The product is beyond a static prototype. Authentication, workers, profiles, requests, applications, reviews, notifications, uploads, a Sofia request map, and the premium UI exist. The rebuilt request backend and database extensions are live.

The system is not ready for an uncontrolled production launch. Sprint 1 has materially improved the request test baseline, but the largest production risks remain:

1. The database is still transitional and dual-writes legacy and new request relations.
2. Worker identity is split between `users.id`, `worker.id`, and `worker.userId`.
3. Media ownership and file lifecycle are not unified.
4. Production request pricing stores only a shallow estimate, not the immutable v0.2 calculation snapshot.
5. Request unit tests and a repeatable verification gate now pass on the Sprint branch, but the database-backed E2E run and complete media/map smoke run are not yet accepted as finished evidence.
6. Security, authorization, rate limiting, upload validation, observability, CI/CD, staging, and rollback automation are incomplete.
7. Production has test/legacy data that needs a reviewed cleanup plan, not an ad hoc deletion.

The recommended next milestone is not payments. Treat Sprint 1 as a tested release candidate, deploy it only through a controlled staging/production procedure, and make Sprint 2 the P0 database, identity, media, authorization, and release-foundation work described in this document.

## Current Delivery Snapshot

### Production

- Live lineage remains based on `codex/feature-sofia-request-map` with the mobile navbar/logout fix merged.
- Request v2 tables and migrations are deployed, but the request model remains transitional.
- The premium dark UI, worker grid/profile surfaces, request wizard, worker-only Sofia map, authentication, applications, assignment, completion, reviews, notifications, and upload endpoints exist.
- The Sprint 1 release candidate described below has **not** been accepted as deployed production state. Production readiness must be verified from the running commit, health/readiness endpoint, database migration state, media paths, and smoke evidence after deployment.
- Production must not be described as launch-ready until the P0 acceptance gates below pass.

### Sprint 1 release candidate

Active stabilization branch:

```text
codex/sprint-1-request-stabilization
```

Release-candidate code commit:

```text
9a638a54811fe75d925071459901b3dba23f69bc
```

Documentation head:

```text
abbfe2f
```

Verified on the branch and in GitHub Actions:

- backend request service/controller tests replaced the former empty specs;
- backend Jest passes: 7 suites, 29 tests;
- frontend pricing verification passes: 97 activities and 174 material items;
- frontend and backend production builds pass;
- `npm run verify:sprint1` provides one repeatable cross-platform gate;
- GitHub Actions on Ubuntu with Node 22 passed for the release-candidate code and the documentation head;
- request multipart media storage, normalized request applications/images, worker-history hydration, grouped portfolio albums, configurable uploads root, readiness endpoint, and smoke script are included;
- canonical actor, category, state, application, media, estimate, and location contracts are documented;
- local mock lifecycle passed creation, Back-state retention, pricing, worker application, duplicate-apply prevention, assignment, completion, one review, and logout.

Not yet accepted as complete Sprint evidence:

- successful isolated MySQL-backed E2E execution and cleanup evidence;
- staging deployment with production-like MySQL and persistent media storage;
- post-deploy production smoke evidence for auth, request lifecycle, map, media, history, and logout;
- verified rollback of application, database migration, and media state.

Sprint references:

- `docs/sprint-1-plan-2026-07-04-to-11.md`;
- `docs/sprint-1-canonical-contracts.md` on the Sprint branch;
- `docs/sprint-1-smoke-checklist.md` on the Sprint branch;
- `docs/sprint-1-release-candidate.md` on the Sprint branch;
- `docs/media-storage-deployment.md` on the Sprint branch.

### Sprint 2 starting point

The foundation branch is:

```text
codex/sprint-2-foundation
```

Sprint 2 should begin with nondestructive consolidation and design decisions before any production reset:

1. remove the second hardcoded worker-profile calculator and use the shared v0.2 pricing engine;
2. approve the canonical identity, request state, category, media, and immutable pricing-snapshot contracts;
3. design and rehearse versioned migrations on a restored database copy;
4. establish staging and deployment/rollback gates;
5. execute production cleanup only after backup verification and explicit approval.

## Source Control and Environments

### Repository

- GitHub repository: `masterhero222/Bricky`.
- Local workspace: `C:\projects\Bricky Live`.
- Production server repository: `/var/www/Bricky`.
- Production domain: `https://bricky.bg`.
- Backend process: PM2 application `bricky-backend`.
- Web server/reverse proxy: nginx.
- Database: MySQL.

### Important branches

- Current live lineage: `codex/feature-sofia-request-map`.
- Current live commit after the mobile navbar fix: `f3aefca78a47b4be670090b1aedcb4773931565c`.
- Request v2 work: `codex/production-request-v2`.
- Premium UI work: `codex/premium-dark-ui`.
- Mock calculator/request baseline: `codex/bricky-mock-test`.
- Pre-premium mock snapshot: `codex/mock-v0.2-before-premium-ui`.
- Mobile navbar fix: `codex/mobile-navbar-fix`.
- Exact pre-UI server source backup: `codex/live-server-backup-2026-06-30-c7d52c3`.

The long-term branch strategy is not settled. Production currently follows a feature-named branch instead of `main` or a dedicated protected release branch. This should be corrected before team development.

### Local mock environment

The mock environment is frontend-only. It uses:

- Vite development mode;
- `frontend/src/services/devMockApi.js`;
- browser localStorage key `bricky.dev.db`;
- development tokens such as `local-dev-token-client-101` and `local-dev-token-worker-201`.

Run it with:

```powershell
cd "C:\projects\Bricky Live\frontend"
npm install
npm run dev
```

The mock database is isolated by browser origin. `localhost:5173`, `127.0.0.1:5173`, and another port do not share state.

### Production database access

MySQL Workbench access is through an SSH tunnel only:

```text
Windows 127.0.0.1:3307
  -> SSH tunnel
  -> VPS MySQL 127.0.0.1:3306
```

The GUI database user is `bricky_admin`. Real passwords must not be added to documentation or Git.

MySQL port `3306` must remain private. See `docs/database-access-workbench-ssh-tunnel.md`.

## Technology Stack

### Frontend

- React 19.
- React Router 7.
- Vite/Rolldown Vite 7.
- Tailwind CSS utilities plus shared theme CSS.
- Axios shared API client.
- Lucide icons.
- Framer Motion dependency.
- Custom slippy-map implementation and map projection helpers.

### Backend

- Node.js.
- NestJS 11.
- TypeORM 0.3.
- MySQL through `mysql2`.
- JWT/Passport authentication.
- bcrypt/bcryptjs dependencies.
- class-validator and class-transformer.
- Multer uploads through Nest platform-express.
- Mail module and notification module.

### Deployment

- Frontend production build served by nginx.
- `/api` proxied to the Nest backend.
- `/uploads` served by the backend/static configuration.
- Backend built with `npm run build` and run under PM2.
- No complete CI/CD pipeline is documented or enforced.

## Frontend Architecture

### Shared shell

- `frontend/src/App.jsx`: route composition and role guards.
- `frontend/src/layouts/Layout.jsx`: public/application shell.
- `frontend/src/components/UI/Navbar.jsx`: responsive navigation.
- `frontend/src/styles/theme.css`: premium dark theme and compatibility styling.
- `frontend/src/services/api.js`: mock-aware shared API wrapper.
- `frontend/src/utils/mediaUrls.js`: API and media URL normalization.

### Main product screens

- `/`: home.
- `/workers`: public worker grid.
- `/worker/:userId` and compatibility worker routes: public worker profile.
- `/auth/login`, `/auth/register`: authentication.
- `/client/profile`: client dashboard, request list, creation, assignment, reviews, profile/settings.
- `/worker/profile`: worker dashboard, feed, requests, profile, gallery, history, calculator, settings/subscription placeholders.
- `/requests`: rebuilt multi-step request wizard/list surface.
- `/repair-map`: worker-only Sofia request map.
- `/about`: about page.

### API access

The preferred path is:

```text
page/component
  -> apiGet/apiPost/apiPut/apiDelete
  -> mockRequest in development with a mock token
  -> Axios and `/api` in production
```

Known cleanup:

- two direct Axios upload calls remain in `WorkerProfile.jsx` for avatar and gallery uploads;
- localStorage is referenced broadly for token, role, user id, and mock data;
- the app has legacy/unused pages and duplicate routing helpers that should be removed after route ownership is documented.

## Backend Modules and APIs

### Authentication

Current routes include:

- `POST /auth/register`;
- `POST /auth/login`;
- `POST /auth/register-client`;
- `POST /auth/register-worker`;
- `POST /auth/dev-login`.

JWT guards protect client, worker, review, notification, and request operations.

### Workers

Current routes include:

- `GET /workers`;
- `POST /workers/by-user-ids`;
- `GET /workers/me`;
- `PUT /workers/me`;
- `POST /workers/me/avatar`;
- `GET /workers/me/gallery`;
- `POST /workers/me/gallery`;
- `POST /workers/me/gallery/:id/delete`;
- `GET /workers/me/history`;
- `GET /workers/:userId/gallery`;
- `GET /workers/:userId/history`;
- `GET /workers/:userId`.

### Requests

Current routes include:

- `POST /requests/draft`;
- `POST /requests`;
- `GET /requests/client`;
- `GET /requests/map`;
- `GET /requests/worker`;
- `GET /requests/worker/completed`;
- `POST /requests/:id/apply`;
- `POST /requests/:id/assign`;
- `POST /requests/:id/unassign`;
- `POST /requests/:id/complete`.

### Reviews and notifications

Current capabilities include:

- client review creation;
- client review lookup;
- worker review/rating lookup;
- current-user notifications;
- mark notification as read.

### AI draft system

`POST /requests/draft` can generate or normalize a request draft. The backend contains a local fallback when the external AI path is unavailable. AI output must never be trusted as validated request data; DTO validation and moderation remain required.

## Current Production Database Model

### Existing core tables

- `users`;
- `worker`;
- `worker_gallery_images`;
- `requests`;
- `reviews`;
- `notifications`.

### Request v2 tables added in production

- `request_applications`;
- `request_images`;
- `repair_categories`.

The repair category seed contains 15 active stable category keys.

### `users`

Current source of authentication identity:

- `id`;
- `name`;
- `email`;
- password hash field;
- `role`.

### `worker`

Current profile data:

- separate `id`;
- `userId` intended to reference `users.id`;
- duplicated email/password/phone fields;
- city and simple-array skills;
- description, experience, equipment;
- avatar URL;
- approval flag.

The duplicated auth fields are legacy debt. Authentication should have one source of truth in `users`.

### `requests`

Current important fields:

- client relation through `clientId`;
- copied client name, email, phone;
- address;
- display category and stable `categoryKey`;
- description;
- latitude, longitude, location source;
- estimate min/max/currency;
- legacy JSON photos/beforePhotos/afterPhotos;
- legacy Bulgarian enum status;
- legacy simple-array `appliedWorkers`;
- assigned/completed worker ids;
- completed date and duration.

### `request_applications`

New normalized application records:

- unique `(requestId, workerUserId)`;
- status: `applied`, `assigned`, `withdrawn`, `rejected`;
- optional offer range and message;
- timestamps.

The request service currently dual-writes this table and legacy `requests.appliedWorkers` for compatibility.

### `request_images`

New normalized request media records:

- request id;
- uploader user id;
- image kind: `general`, `before`, `after`;
- URL and storage key;
- MIME type and size;
- sort order;
- approval flag;
- timestamp.

The service still hydrates/falls back to legacy request JSON photo arrays. The `url` field can currently hold large values, so storage policy is not yet fully enforced.

### `repair_categories`

Production was seeded with these stable keys:

1. `vik`;
2. `electro`;
3. `painting`;
4. `plaster`;
5. `tiles`;
6. `bathroom_renovation`;
7. `drywall`;
8. `flooring`;
9. `heating_cooling`;
10. `windows_doors`;
11. `furniture_mounting`;
12. `roof_waterproofing`;
13. `demolition_cleanup`;
14. `full_renovation`;
15. `small_repairs`.

Frontend and backend also contain static category catalogs. The database is not yet the only source of truth.

### Migrations applied for request v2

The production deployment applied:

- `scripts/db-request-category-varchar-migration.sql`;
- `scripts/db-request-core-fields-migration.sql`;
- `scripts/db-request-images-applications-migration.sql`;
- `scripts/db-repair-categories-seed.sql`.

The migration rehearsal was performed on a temporary database restored from a production dump before applying the scripts to production.

The pre-request-v2 production backup is:

```text
/var/www/Bricky/backups/db/bricky_before_request_v2_20260630-192900.sql.gz
```

The 22 existing requests were preserved during that deployment.

## Request Lifecycle Today

### Client creates a request

1. Client selects one of 15 repair categories.
2. Client selects category-specific activities.
3. The wizard asks category/activity-specific size or quantity questions.
4. Exact square meters are requested only for area-based activities.
5. Client chooses `labor_only` or `labor_plus_materials`.
6. Client enters an exact address or permits browser geolocation.
7. Client selects intent and Bricky communication preference.
8. Client attaches problem/before photos.
9. The calculator produces a structured expected range.
10. Production request creation persists the supported subset: category key, coordinates, estimate min/max/currency, description, and images.

### Worker applies

1. Worker sees eligible requests in the feed or map.
2. Worker applies through `POST /requests/:id/apply`.
3. The service writes a normalized application and maintains the legacy array during transition.

### Client assigns

1. Client views applicants.
2. Client assigns a worker through Bricky.
3. Application/request state and notification data are updated.

### Worker completes

1. Assigned worker closes the request.
2. Worker can attach after photos.
3. Completion date and duration are stored.
4. Completed work is intended to appear in worker history/portfolio.

### Client rates

1. Client submits one review per request.
2. Rating contributes to the worker profile.

## Calculator State

### Implemented in mock/shared frontend engine

- 15 categories.
- 97 activity pricing rules.
- 174 indexed material items.
- EUR ranges rounded upward to 5 EUR.
- modes: `labor_only` and `labor_plus_materials` only.
- labor, material, total, expected, and possible ranges.
- category/activity-specific unit handling.
- exact area handling and 2000 sq.m cap.
- bundle protection and shared-visit discount logic.
- material confidence and inspection warnings.
- expected-range ratio protection at 2.5.
- immutable mock `pricingSnapshot` with version metadata.
- price presentation separated from free-form description.

Verification on 2026-07-04:

```text
Pricing config verified: 97 activities, 174 material items.
Frontend production build: PASS.
```

### Not production-ready

- Pricing ranges have not been validated with 3-5 active workers across all categories.
- Supplier/material index assumptions need current market verification.
- Worker profile still contains a second independent calculator.
- Production DTO/database do not persist the complete immutable v0.2 calculation snapshot.
- Urgency, access/complexity, material quality, and customer-supplied-material controls are not complete.
- Pricing administration and version activation do not exist.

## Sofia Request Map

Implemented and live:

- worker-only route;
- clients are denied access;
- drag/pan and wheel zoom;
- Sofia map with readable streets and Crime.Net-inspired visual treatment;
- realistic request coordinates;
- request clustering;
- expanded selection for close markers;
- hover emphasis;
- details panel synchronized to selected request;
- request photos in details;
- apply from map.

Remaining:

- production geocoding for manually entered addresses;
- provider and usage-cost decision: Google Maps, OpenStreetMap, or commercial tiles;
- category/status filters;
- category icons;
- privacy policy for exact addresses;
- moderation before a request becomes visible on the map;
- server-side geographical/visibility filtering at scale.

## Worker Profiles, Gallery, and History

Implemented:

- editable worker profile;
- avatar upload;
- gallery upload and delete endpoints;
- public worker grid with saved avatar/profile data;
- compact completed-object portfolio concept in mock;
- public and private gallery/history endpoints.

Before launch:

- verify all production avatar/gallery/history paths after restarts and deploys;
- define one media storage abstraction and stable URL policy;
- group photos by completed request rather than one unstructured gallery;
- enforce ownership, MIME validation, file-size limits, dimensions, count limits, and safe filenames;
- remove orphaned files when records are deleted;
- define moderation/approval flow;
- decide whether an image is request evidence, public portfolio media, or both;
- add fallbacks for missing files without hiding operational errors.

## Premium UI and Mobile Navigation

Live UI includes:

- premium navy theme;
- consistent green primary and blue secondary actions;
- responsive worker grid and request cards;
- request photo carousel;
- responsive dashboard navigation;
- opaque mobile dropdown menu;
- visible mobile logout for authenticated users.

The frontend build still produces a JavaScript chunk above 500 kB. Route-level code splitting is recommended.

## Current Verification and Test Health

### Passing

- frontend `npm run build`;
- frontend `npm run test:pricing`;
- request-v2 backend build during deployment;
- public smoke checks for frontend routes and `/api/workers` during deployment;
- mobile navbar local and live visual verification.

### Sprint 1 automated status

The earlier baseline had two empty request spec files. That baseline has been corrected on `codex/sprint-1-request-stabilization`:

```text
Backend Jest: PASS, 7 suites / 29 tests
Backend build: PASS
Frontend pricing verification: PASS, 97 activities / 174 material items
Frontend build: PASS
Combined npm run verify:sprint1 gate: PASS
GitHub Actions (Ubuntu, Node 22): PASS
```

Covered at unit/contract level:

- client creation and ownership;
- worker rejection for client-only creation;
- worker feed/map actor context;
- first and duplicate application behavior;
- assignment ownership and application requirement;
- completion by the assigned worker and rejection of another worker;
- before/after compatibility hydration;
- controller role and route argument boundaries;
- media storage path/configuration behavior;
- readiness/smoke gate behavior.

Still missing or incomplete before production acceptance:

- complete registration/login authorization matrix;
- database-backed lifecycle proof against an isolated MySQL schema;
- real multipart media upload, retrieval, deletion, and orphan cleanup;
- map visibility and privacy behavior in the same E2E scenario;
- review ownership/uniqueness integration coverage;
- migration rehearsal and rollback as an automated release gate;
- production smoke after every deploy.

## Main Architecture and Quality Findings

### BP-01: Identity model is ambiguous

`users.id`, `worker.id`, and `worker.userId` are mixed across routes, relations, reviews, requests, and frontend navigation.

Required decision: use `users.id` as the external actor id and keep worker profile id internal, or formalize another canonical identifier. Every API contract must follow the decision.

### BP-02: Request model is transitional

Applications and images have normalized tables, but legacy arrays/JSON remain active. Dual-write creates drift risk, complicates transactions, and makes rollback behavior unclear.

### BP-03: Status and category sources are inconsistent

- request statuses are Bulgarian display strings in the database;
- applications use machine constants;
- categories have stable keys but also duplicate frontend/backend/database catalogs.

Use machine constants in storage/API and translate only in presentation.

### BP-04: Media lifecycle is fragmented

Worker gallery files, avatars, request JSON photos, request image rows, mock data URLs, and frontend public assets use different models. Production needs one media service and lifecycle.

### BP-05: Pricing history is incomplete in production

Production estimate min/max/currency cannot explain how a historical estimate was calculated. Rule changes could make support, audit, and analytics impossible without an immutable calculation snapshot.

### BP-06: Database constraints and relations are incomplete

Several relations are represented by integer columns without explicit TypeORM relations/foreign keys. Deletion behavior and ownership are therefore partly enforced in application code.

### BP-07: TypeORM schema policy needs enforcement

`synchronize` is environment-controlled. Production must force it off and use versioned, reviewed, reversible migrations only.

### BP-08: Authentication and API security need hardening

Required review areas:

- role and resource ownership checks;
- short-lived access and refresh-token strategy;
- token storage risk from localStorage;
- password policy and reset/email verification;
- rate limiting and brute-force protection;
- Helmet/security headers and strict CORS;
- upload validation and malware/content screening;
- DTO coverage instead of `any` bodies;
- audit logs for admin, billing, and destructive actions;
- removal or strict production disabling of dev login/test endpoints.

### BP-09: No dependable release pipeline

Deployments are manual SSH, pull, install, build, PM2 restart, and smoke tests. Backups exist, but CI, staging, migration locking, health checks, and automated rollback are not established.

### BP-10: Observability is insufficient

Add structured logs, request correlation ids, exception reporting, uptime/health endpoints, database monitoring, upload errors, payment audit logs, and alerts.

### BP-11: Frontend technical debt

- two direct Axios upload calls remain;
- legacy pages/routes and duplicate auth helpers exist;
- large worker/client page components own too many responsibilities;
- localStorage identity access is spread through UI code;
- production bundle needs code splitting;
- error/loading/empty states need a systematic contract.

## Before Production TODO

This section intentionally contains and restructures the complete backlog from `docs/next-session-todo.md`.

Backlog reconciliation rule:

- items marked complete in the historical TODO are preserved under `Completed Work That Should Not Be Reopened Without Evidence`;
- incomplete database, request, media, profile, gallery, communication, map, calculator, moderation, security, operations, and monetization work is represented in P0-P3 below;
- passing work on a feature/Sprint branch is not treated as production acceptance;
- destructive database cleanup and live deployment always require a backup, rehearsal, rollback plan, and explicit approval.

## P0 - Launch Blockers

### P0.1 Establish the release process

- Create protected `main` and/or `production` branches.
- Stop using a feature-named branch as the permanent production source.
- Require PR review and passing checks before merge.
- Add a staging environment using a production-like database and file storage.
- DONE for the Sprint branch baseline: CI runs frontend build, pricing tests, backend build, and backend Jest.
- NEXT: extend CI with isolated database integration tests, migration rehearsal/rollback, browser E2E, and deploy smoke gates.
- Define version tags and release notes.
- Automate frontend/backend artifact backups and rollback.
- Add a deployment checklist for environment variables, migrations, uploads, nginx, PM2, and smoke tests.
- Clean accidental nested/backup repositories from the active server checkout.
- Keep server-only merge history out of source branches unless intentionally synchronized.

### P0.2 Freeze and redesign the canonical database model

- Document the final ownership of every table and foreign key.
- Select one canonical worker/user identifier.
- Remove duplicated worker authentication fields from active use.
- Replace weak integer references with explicit foreign keys and deletion rules.
- Normalize request statuses to machine constants: `new`, `applied`, `assigned`, `in_progress`, `completed`, `canceled`.
- Use stable repair category keys everywhere and Bulgarian labels only in UI.
- Finish migration from `appliedWorkers` to `request_applications`.
- Finish migration from request JSON photos to normalized media rows/files.
- Add a normalized completed-job/history model if requests alone cannot represent portfolio publication.
- Add moderation/approval state for requests and media.
- Add address privacy/publication fields, not only raw coordinates.
- Add immutable calculator snapshot storage.
- Add indexes for client, assigned/completed worker, status, category key, created time, applications, images, reviews, and map queries.
- Force `TYPEORM_SYNCHRONIZE=false` in production.
- Adopt a migration tool/process with migration history and rollback scripts.

### P0.3 Review and execute database cleanup safely

- Decide whether production data will be retained, anonymized, or reset.
- The previous proposal was to retain only the agreed client and worker test accounts, but this is destructive and requires fresh approval.
- Create and verify `mysqldump` before cleanup.
- Rehearse cleanup on a restored copy.
- Delete dependent reviews, notifications, applications, images, history, profiles, and requests in FK-safe order.
- Archive/delete orphaned uploaded files only after database rows are verified.
- Produce row-count and orphan reports before and after cleanup.
- Do not run the old reset script blindly; update it for request-v2 tables first.

### P0.4 Stabilize the full request lifecycle

- Client registration and login.
- Client profile persistence.
- Request wizard back/forward navigation and validation.
- Category/activity/quantity handling.
- Browser geolocation consent and exact-address fallback.
- Before/problem photo upload.
- Immutable price snapshot.
- Worker-only feed and map visibility.
- Worker apply with idempotency.
- Client ownership check before assignment/unassignment.
- Worker ownership check before completion.
- After-photo upload and duration calculation.
- Completed history and portfolio grouping.
- One review per completed request by the owning client.
- Notifications for application, assignment, completion, and review milestones.
- Transaction boundaries so partial dual-writes cannot corrupt state.

### P0.5 Unify production media storage

- Select local persistent volume or object storage.
- Introduce a shared `media_assets` abstraction or a strictly defined set of media tables.
- Store file paths/keys and metadata, never browser data URLs in production.
- Validate MIME from file content, extension, dimensions, size, and count.
- Generate safe unique names and thumbnails.
- Define private vs public access.
- Enforce uploader ownership.
- Support before, after, avatar, gallery, and portfolio roles.
- Add moderation state and audit trail.
- Delete orphaned files safely.
- Verify persistence across deploys/restarts.
- Add user-friendly fallback UI and operational error logging.

### P0.6 Security baseline

- Disable/remove production dev-login and DevTestPanel paths.
- Add rate limits for login, registration, AI draft, uploads, applications, and reviews.
- Add security headers and review CORS.
- Review JWT lifetime, revocation/logout behavior, refresh strategy, and token storage.
- Add password reset and email verification.
- Add DTOs for all request bodies; remove `any` from security-sensitive controllers.
- Validate resource ownership in service and database layers.
- Add upload scanning/content checks.
- Remove worker phone numbers from client-facing APIs/UI.
- Keep client-worker communication inside Bricky.
- Add privacy policy for exact address and map visibility.
- Add secret rotation and credential management; no secrets in prompts/docs/Git.
- Replace root SSH deployment/tunnel use with limited accounts.
- Keep MySQL `3306` private.

### P0.7 Automated test baseline

- DONE on `codex/sprint-1-request-stabilization`: replace empty request specs and expand the backend baseline to 7 suites / 29 passing tests.
- DONE on the Sprint branch: add the repeatable `npm run verify:sprint1` build/test gate.
- DONE on the Sprint branch: add a passing GitHub Actions verification workflow on Ubuntu/Node 22.
- Add database-backed request integration tests.
- Add auth/role/ownership matrix tests.
- Add duplicate application and invalid transition tests.
- Add media validation/upload/delete tests.
- Add review uniqueness tests.
- Add migration up/rollback tests on a production-like dump.
- Add browser E2E for client-create -> worker-apply -> client-assign -> worker-complete -> client-review.
- Add post-deploy smoke checks for workers, login, request creation, profile, gallery, map, and history.
- Block deployment when required checks fail.

Sprint 1 is a release candidate, not production acceptance. The remaining database-backed, staging, migration, real-media, rollback, and post-deploy smoke evidence is a P0 release obligation. Passing mock/localStorage behavior alone is insufficient.

## P1 - Product Readiness

### P1.1 Calculator validation and production integration

- Validate all 15 categories and 97 activity rules with 3-5 active workers.
- Record source period, assumptions, location, VAT, minimum visit, and exclusions for each price correction.
- Validate 174 material-index items with current suppliers.
- Define index review/version cadence.
- Move WorkerProfile calculator to the shared engine.
- Remove duplicate pricing constants and legacy category estimator.
- Add urgency, complexity/access, material quality, and customer-supplied-material controls.
- Validate category-specific units: sq.m, linear meter, point, item, room, task, package, volume, inspection.
- Validate shared-visit discounts and bundle rules.
- Keep materials at 100% unless a reviewed bundle says otherwise.
- Preserve expected and possible ranges plus confidence and reasons.
- Add electrical/plumbing/inspection disclaimers.
- Add focused tests for every unit type, mode, multiplier, bundle, missing rule, and range integrity.
- Design and migrate the immutable production calculation snapshot only after validation.
- Never recalculate old requests only from current live rules.
- Later schema candidates: `repair_activities`, `repair_pricing_rules`, `material_price_index`, `calculator_versions`, `request_calculations`.

### P1.2 Repair catalog ownership

- Decide whether database or versioned application config is canonical.
- Remove triple maintenance across frontend, backend, and seed data.
- Preserve the 15 stable keys.
- Add category/activity activation, ordering, and versioning.
- Add admin validation before changing public categories.

### P1.3 Worker profile and portfolio quality

- Validate profile fields and lengths.
- Add specialization/service-area structure instead of free text/simple arrays where needed.
- Verify avatar and profile persistence in production.
- Group completed objects into compact CV-style albums.
- Show one or two covers and provide a complete viewer/carousel.
- Display real Bricky-completed job count and duration.
- Decide portfolio publication consent and moderation.
- Prevent clients from seeing worker phone numbers.

### P1.4 Bricky communication

- Replace phone-first contact blocks with in-platform contact/application flow.
- Design conversation/message ownership.
- Add notification preferences.
- Add abuse/report/block controls.
- Decide retention and moderation rules.

### P1.5 Map readiness

- Implement real geocoding for typed addresses.
- Decide map provider and cost limits.
- Add server-side category/status/area filters.
- Add category-specific marker icons.
- Add moderation before map publication.
- Cluster efficiently for larger datasets.
- Hide exact client address until the correct lifecycle/visibility condition.
- Add geocoding failure/manual correction flow.
- Add map accessibility and non-map list alternative.

### P1.6 Moderation and administration

- Add admin roles and authorization.
- Moderate public requests, profiles, avatars, portfolio images, descriptions, and reviews.
- Decide human-first vs AI-assisted moderation.
- AI may flag or score content but must not silently publish/delete high-impact content without policy.
- Add audit logs and appeal/review states.
- Add manual account, request, media, category, and credit controls.

### P1.7 Frontend cleanup and accessibility

- Route all network calls through the shared API layer.
- Centralize auth/session state instead of reading localStorage everywhere.
- Remove unused/duplicate pages and routing helpers.
- Split large ClientProfile and WorkerProfile components.
- Add route-level code splitting.
- Standardize loading, empty, retry, offline, unauthorized, and server-error states.
- Verify mobile layouts for request wizard, map, profile, gallery, and dialogs.
- Add keyboard navigation, focus states, labels, contrast checks, and reduced-motion support.
- Stabilize/reset the mock DB and document seed versions.

### P1.8 Operational readiness

- Add `/health` and readiness checks.
- Add structured logs and request ids.
- Add error tracking and alerts.
- Monitor PM2 restarts, nginx 5xx, DB connections, disk usage, and upload failures.
- Add scheduled database and media backups with restore drills.
- Add retention policy.
- Document incident response and rollback ownership.
- Audit dependency vulnerabilities; do not apply breaking `audit fix --force` blindly.

## P2 - Monetization, Credits, and Payments

Do not implement real payments before P0 and the relevant P1 calculator/request work are complete.

### Product direction

- Clients remain free initially.
- Workers pay for request access, applications, visibility, profile/portfolio tools, and reputation features.
- Initial model does not take commission from repair value and does not act as escrow.
- Planned plans: Free, Basic, Standard, Pro.

### Plan dimensions

- visibility level;
- monthly application allowance;
- gallery/media limits;
- completed-job visibility;
- ranking/priority;
- service-area/category access;
- analytics and future verified badge.

### Credits MVP without payments

- Add `worker_credit_wallets`.
- Add append-only `worker_credit_transactions`.
- Grant trial credits/free applications.
- Spend credits atomically when applying.
- Block application when allowance and balance are insufficient.
- Show balance and applications remaining.
- Add manual admin adjustments with audit reason.
- Test business logic before payment-provider integration.

### Visibility phase

- Add versioned worker plans.
- Attach active plan/visibility level to workers.
- Filter feed/map fields by entitlement.
- Add upgrade prompts.
- Keep entitlement checks on the server, not only in UI.

### Payment phase

- Choose provider after legal/accounting review.
- Add `payment_orders` and immutable provider event records.
- Implement idempotent webhooks.
- Support credit purchases and plan activation/cancellation.
- Store payment history.
- Handle failed, canceled, expired, refunded, and disputed payments.
- Add reconciliation and admin logs.
- Never trust a frontend success page as payment confirmation.

### Planned services

- `RequestApplicationsService`;
- `CreditsService`;
- `PlansService`;
- `PaymentsService`;
- `RequestVisibilityService`.

### Candidate APIs

- `GET /worker/billing/status`;
- `GET /worker/credits`;
- `POST /worker/credits/purchase`;
- `GET /worker/credits/transactions`;
- `GET /worker/plan`;
- `POST /worker/plan/subscribe`;
- `POST /worker/plan/cancel`.

### Business rules still undecided

- exact plan prices;
- free application count;
- monthly limits;
- credit costs by request category/value;
- visibility and ranking logic;
- provider;
- VAT/invoicing requirements;
- refund and admin override rules;
- abuse protection and credit restoration rules.

## P3 - Later Optimization

- Search and pagination for workers and requests.
- Avoid returning heavy gallery/history payloads in worker grid endpoints.
- Geospatial indexes and bounding-box map queries.
- Caching of public worker summaries and catalog data.
- Image CDN/transformations.
- Analytics for conversion, application rate, completion rate, time-to-assign, repeat clients, estimate accuracy, and dispute rate.
- Recommendation/ranking only after enough clean outcome data exists.
- AI-assisted request drafting, classification, moderation, and estimate confidence after deterministic validation is stable.

## Completed Work That Should Not Be Reopened Without Evidence

- Shared premium dark UI and responsive navbar.
- Opaque mobile menu and visible authenticated logout.
- Worker grid using saved profile/avatar data.
- Client and worker mock authentication switcher.
- Mock request photo flow.
- Mock worker gallery/history and compact portfolio concept.
- 15-category repair catalog.
- Multi-step request wizard with back navigation.
- Browser geolocation request plus exact-address fallback.
- Removal of Sofia district dropdown.
- Two calculator modes only: labor and labor plus materials.
- v0.2 expected-range UX and exact-area logic.
- Sofia worker-only request map with clustering and details.
- Production `/api` routing instead of insecure mixed-content server-IP calls.
- Production request-v2 schema additions and backend routes.
- Production request/applications/images/category migration rehearsal and backup.
- Sprint branch backend test baseline: 7 suites and 29 tests passing.
- Sprint branch repeatable `npm run verify:sprint1` gate.
- Passing GitHub Actions verification on Ubuntu/Node 22.
- Canonical Sprint contracts for actor ids, category keys, request transitions, normalized applications/media, estimates, and locations.

Completed does not mean production-hardened. The TODO above still requires validation, tests, cleanup, and removal of transitional compatibility paths.

## Recommended Execution Order

1. Freeze production feature additions and appoint one owner for API/database contracts.
2. Preserve the Sprint 1 release candidate and deploy it only through staging, backup, migration, readiness, smoke, and rollback gates.
3. Protect release branches and require the existing CI plus the missing DB/E2E checks.
4. Consolidate the duplicate worker-profile calculator onto the shared v0.2 engine.
5. Decide canonical identity, status, category, media, and calculator snapshot models.
6. Write versioned migrations and backfill scripts; rehearse them on a restored production dump.
7. Replace dual-write paths and add transaction-backed integration tests.
8. Complete the media service and migrate existing valid media.
9. Add the security baseline and remove production test/dev paths.
10. Build the complete automated request-lifecycle E2E test.
11. Clean production data only after the new schema and restore test are approved.
12. Validate calculator prices with workers and suppliers.
13. Finish profile, portfolio, communication, map privacy, moderation, and accessibility.
14. Run a closed beta with monitored real workflows.
15. Implement credits manually, then visibility plans, then payment integration.

## Decisions Requested From the Technical Director

1. What is the canonical actor/worker identifier?
2. Is the next schema an incremental migration or a clean v2 schema with backfill?
3. Is media stored on a VPS volume or object storage?
4. Is the repair catalog config-driven or database-administered?
5. What is the canonical request state machine and who may trigger each transition?
6. What request/address information is visible before assignment?
7. What calculator snapshot is required for audit and support?
8. What is the closed-beta data-retention and cleanup policy?
9. Which map/geocoding provider is acceptable for cost, privacy, and terms?
10. What security and test gates are mandatory for every release?
11. Which payment provider and Bulgarian/EU invoicing model will be used later?
12. What parts of moderation may be AI-assisted and what always requires human review?

## Related Documentation

- `docs/sprint-1-plan-2026-07-04-to-11.md` - active Sprint 1 scope and Definition of Done.
- `docs/sprint-1-release-candidate.md` - release-candidate commits, verification, and deployment status.
- `docs/sprint-1-smoke-checklist.md` - lifecycle and post-deploy smoke scenarios.
- `docs/media-storage-deployment.md` - upload storage and deployment requirements.
- `docs/next-session-todo.md` - historical detailed backlog.
- `docs/database-systems-audit.md` - table-by-table and flow-by-flow database audit.
- `docs/database-access-workbench-ssh-tunnel.md` - secure GUI database access.
- `docs/mock-database-localstorage.md` - mock database behavior and commands.
- `docs/calculator-mock-pricing-v0.2.md` - current calculator engine and UX.
- `docs/business-plan.md` - monetization, credits, plans, and payment direction.
- `docs/2026-06-22-sofia-map-feature.md` - map implementation.
- `docs/premium-dark-ui-v0.1.md` - UI redesign.
- `docs/2026-06-21-session-summary.md` - historical implementation notes.

## Final Assessment

Bricky has enough implemented product flow and a credible Sprint 1 release candidate to justify a structured stabilization phase. The next gains will not come from adding more visible features. They will come from making identity, requests, media, pricing history, authorization, migrations, tests, and releases predictable.

The correct pre-production target is a closed beta release in which one client request can be traced end to end across database rows, media files, audit logs, notifications, pricing snapshot, worker history, and automated tests without legacy fallback ambiguity.

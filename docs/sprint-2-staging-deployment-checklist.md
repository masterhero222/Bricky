# Sprint 2 Staging And Production Checklist

## Release Policy

Deploy Sprint 2 to staging first. Do not deploy the canonical media proposal with the moderation gate. Production rollout requires a tested backup and rollback path.

## Before Staging

- Confirm the release commit is green in GitHub Actions.
- Confirm the worktree is clean and the release commit exists on the remote branch.
- Record current production commit, PM2 process list, Node version, and MySQL version.
- Create a database backup with `mysqldump --single-transaction --routines --triggers`.
- Archive or snapshot the uploads directory separately; the DB backup does not contain uploaded files.
- Verify required environment variables without printing secrets: DB connection, JWT secret, uploads path, frontend API base, mail settings.
- Confirm `TYPEORM_SYNCHRONIZE=false` in production.

## Staging Migration

1. Restore a recent production backup into an isolated staging database.
2. Apply `20260705_001_sprint2_foundation_up.sql`.
3. Apply `20260705_002_moderation_gate_up.sql`.
4. Re-run both scripts to verify idempotency.
5. Confirm `bricky_schema_migrations` contains both versions.
6. Confirm existing rows are approved and newly created rows default to `pending_review`.
7. Confirm `admin_audit_logs` includes old/new/IP columns.

## Staging Application Smoke

- Login as client, worker, and admin.
- Create a request with images as a client.
- Confirm it is visible to the owner and admin but absent from worker feed and map.
- Reject it with a reason; confirm the client sees the reason.
- Correct and resubmit; confirm it returns to `pending_review`.
- Approve request and images; confirm they appear in worker feed/map.
- Apply, assign, upload after images, complete, and review.
- Approve the review and confirm the public rating changes.
- Upload worker avatar/gallery media and confirm public visibility only after approval.
- Suspend a test user and confirm both login and existing JWT access fail.
- Reactivate the user with a reason.
- Inspect the audit tab for actor, target, reason, IP, and old/new values.
- Verify direct `/admin` access as client/worker returns to login or receives 403 from API.
- Verify uploaded files survive backend restart.

## Production Deployment

1. Put the release in a short maintenance window if schema changes are being applied.
2. Create fresh DB and uploads backups and record their paths.
3. Fetch the exact tested commit; do not merge on the server.
4. Install dependencies with lockfiles.
5. Build frontend and backend.
6. Apply the two reviewed UP migrations once.
7. Deploy frontend assets atomically.
8. Restart the backend with PM2 and save the process list.
9. Check PM2 logs for startup, DB, and storage errors.
10. Run health/API smoke requests through nginx and the public HTTPS domain.

## Production Smoke

- `/`, `/workers`, `/auth/login`, and direct SPA routes return 200.
- `/api/workers` returns JSON rather than nginx 502.
- Login works for one client, worker, and admin.
- A disposable request remains hidden until admin approval.
- Admin dashboard, queues, accounts, and audit tabs load.
- Approved request appears in worker queue/map.
- Existing worker profiles, galleries, and request images still load.
- Browser console has no mixed-content, CORS, 404 upload, or 502 API errors.
- Mobile navbar and logout remain usable.

## Rollback Trigger

Rollback immediately for login failure, widespread 5xx responses, missing existing content, broken uploads, moderation bypass, or irreversible migration errors.

## Rollback Procedure

1. Stop incoming writes or enable maintenance mode.
2. Re-deploy the previously recorded frontend/backend commit.
3. Use the reviewed DOWN scripts only when their data-loss implications are acceptable.
4. Prefer restoring the pre-deploy DB backup if production writes during the failed release can be discarded; otherwise reconcile writes before restore.
5. Restore the uploads snapshot only if files were changed or removed.
6. Restart PM2, verify nginx, and repeat the public smoke checks.
7. Preserve failure logs and DB evidence for diagnosis.


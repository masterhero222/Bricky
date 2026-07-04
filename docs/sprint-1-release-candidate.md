# Sprint 1 Release Candidate

Prepared: 2026-07-05

## Candidate

- Branch: `codex/sprint-1-request-stabilization`
- Commit: `9a638a54811fe75d925071459901b3dba23f69bc`
- Base: current `origin/main` is merged
- Merge preflight: PASS, no conflicts
- Difference from `origin/main`: 37 commits ahead, 0 behind
- GitHub Actions: [run 28722587616](https://github.com/masterhero222/Bricky/actions/runs/28722587616), PASS
- Local Sprint gate: pricing `97/174`, frontend build, backend build, backend Jest `29/29`

## Proven Locally And In CI

- request creation, authorization, category, estimate, location, apply, assign, complete, history, and review contracts;
- real multipart before/after upload, static retrieval, ownership rejection, and deletion in guarded MySQL E2E;
- worker history hydration from `request_images` with one batched query;
- grouped before/after portfolio album and map marker detail selection in browser smoke;
- opaque mobile navigation and logout;
- one persistent storage root independent of PM2 working directory;
- storage survives a new Nest application instance;
- readiness checks distinguish database and storage failures;
- clean Ubuntu/Node 22 GitHub Actions checkout passes the full gate.

## Not Yet Proven

The release candidate has not been deployed to a server environment. On 2026-07-05:

```text
GET https://bricky.bg/api/health/ready -> 404
```

This is expected for the currently deployed version and proves that the readiness/storage hardening is not live yet.

Sprint 1 cannot be signed off as deployed until the same uploaded media URL returns successfully before and after a PM2 restart.

## Operator Deployment Gate

Before deployment:

1. Create a database backup and media archive.
2. Confirm the server worktree is clean or preserve server-only changes.
3. Prepare `/var/lib/bricky/uploads` and copy existing `backend/uploads` files as described in `docs/media-storage-deployment.md`.
4. Set `UPLOADS_DIR=/var/lib/bricky/uploads` and optionally `APP_COMMIT_SHA=9a638a5` in the backend environment.
5. Deploy this exact commit to staging first.
6. Build frontend and backend.
7. Restart PM2 with `--update-env`.

Acceptance commands:

```bash
curl -fsS https://<STAGING_HOST>/api/health/ready

BRICKY_BASE_URL=https://<STAGING_HOST> \
BRICKY_MEDIA_URL=/api/uploads/requests/<DISPOSABLE_TEST_FILE> \
npm run smoke:readiness

pm2 restart bricky-backend --update-env

BRICKY_BASE_URL=https://<STAGING_HOST> \
BRICKY_MEDIA_URL=/api/uploads/requests/<SAME_DISPOSABLE_TEST_FILE> \
npm run smoke:readiness
```

Required result:

- readiness returns `status=ok`, `database=ok`, `storage=ok`;
- the exact same image URL returns `200 image/*` before and after restart;
- worker history and public portfolio render the same before/after album;
- production deploy proceeds only after staging passes.

## Rollback Trigger

Rollback immediately when any of these occur:

- `/api/health/ready` is not `200`;
- API endpoints return `502`;
- media returns HTML, `404`, or a non-image content type;
- login/request lifecycle fails;
- PM2 repeatedly restarts.

Restore the previous commit/environment and media path, restart PM2, then verify one known API endpoint and one known existing image through `/api/uploads/...`.

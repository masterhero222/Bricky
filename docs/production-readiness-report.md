# Bricky Production Readiness Report

Status: **DEPLOYED / GREEN WITH ACCEPTED RESIDUAL RISK**
Updated: 2026-07-07

## Ready Locally

- Backend-authoritative lifecycle and permission gates.
- Shared media processing and moderation policy.
- Persistent notification records for lifecycle and rejection events.
- Versioned additive migration package with local contract verification.
- Production builds and local automated tests.

## Production Evidence

- Merge SHA: `5a941fc6dd19c91685662a6e94d008130646d5c3`.
- Pull request: `#5`.
- Release path: `/var/www/Bricky-releases/5a941fc6dd19c91685662a6e94d008130646d5c3`.
- Backup path: `/var/www/Bricky/backups/production_20260707_125029`.
- Backend readiness passed directly and through `https://bricky.bg/api/health/ready`.
- Public frontend route `https://bricky.bg/requests` returned HTTP 200.
- Administrator, client, and worker API logins returned their expected roles.
- Public worker data, worker feed, mock requests, full WebP media, and thumbnails were readable.
- Admin dashboard browser smoke passed without captured console errors.
- Mobile admin smoke at 390x844 passed without horizontal overflow.
- PM2 reports `bricky-backend` online with `TYPEORM_SYNCHRONIZE=false`.

## Rollback Readiness

The production backup contains the database dump, uploads archives, previously served frontend, PM2 state, previous and target commits, and Node/MySQL version records. Detailed rollback commands are in `docs/sprint-2-production-release.md`.

## Recorded Evidence

- Exact staging SHA: `a0b7bb0b6700d7c9a45e122600a6e5c511c10222`.
- CI: GitHub Actions run `28828356248`, successful.
- Staging readiness: database and storage report `ok`.
- Staging media: request before/after full WebP and thumbnails returned HTTP 200 after PM2 restart.
- Production nginx content root, production database, and production PM2 process were updated to the exact merge SHA.
- Desktop admin/client/worker and mobile navigation/logout acceptance passed.
- Disposable staging DOWN/UP rehearsal preserved user, request, media, and review row counts.

## Accepted Residual Risk

The final gate used generated 10/15/20 MB EXIF fixtures because an original phone image over 10 MB was not available. This is a follow-up acceptance item, not an unrecorded pass.

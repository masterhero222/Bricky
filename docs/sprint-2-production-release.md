# Sprint 2 Production Release

Date: 2026-07-07  
Status: **DEPLOYED / HEALTHY**

## Release Identity

- Pull request: `#5`
- Merge SHA: `5a941fc6dd19c91685662a6e94d008130646d5c3`
- Release directory: `/var/www/Bricky-releases/5a941fc6dd19c91685662a6e94d008130646d5c3`
- Backend process: `bricky-backend`
- Backend entry point: `/var/www/Bricky-releases/5a941fc6dd19c91685662a6e94d008130646d5c3/backend/dist/main.js`
- External uploads directory: `/var/www/Bricky-production-uploads`
- Active nginx frontend root: `/var/www/Bricky/frontend/dist`
- Database: `bricky`
- Schema management: migrations only; `TYPEORM_SYNCHRONIZE=false`

## Data Promotion

The production database was replaced with the sanitized Sprint 2 staging/mock dataset by explicit owner instruction. The owner confirmed that no real user data needed preservation. A dedicated active administrator account was created after the import. Credentials are distributed out of band and must never be committed.

## Backup

Pre-deployment backup directory:

```text
/var/www/Bricky/backups/production_20260707_125029
```

It contains:

- compressed production database dump;
- compressed staging source dump;
- active and legacy frontend archives;
- legacy uploads archive;
- PM2 process state;
- previous and target commit records;
- Node and MySQL version records.

## Verification

- Direct backend readiness: passed.
- Public readiness at `/api/health/ready`: passed.
- Production frontend `/requests`: HTTP 200.
- Administrator, client, and worker role logins: passed.
- Worker feed, public worker grid, and mock request reads: passed.
- Full before/after WebP files and thumbnails: HTTP 200.
- Admin dashboard browser smoke: passed with no captured console errors.
- Mobile admin smoke at 390x844: passed without horizontal overflow.
- PM2 process: online.

## Rollback

Rollback is required for authentication failure, repeated 5xx responses, moderation bypass, missing media, migration failure, or data loss.

1. Stop the current backend:

```bash
pm2 stop bricky-backend
```

2. Restore the database from `database.sql.gz` in the backup directory.

3. Restore the previous frontend archive into `/var/www/Bricky/frontend/dist`.

4. Restore uploads from the relevant backup archive when the failure involves media.

5. Start the previous backend commit recorded in `previous-commit.txt`, then restore the saved PM2 state if needed.

6. Verify direct and public health, login, request reads, and media URLs before reopening normal traffic.

Do not run destructive schema synchronization during rollback.

## Accepted Residual Risk

Generated exact 10/15/20 MB EXIF fixtures passed compression, rotation, WebP conversion, dimensions, output-size, and thumbnail checks. An original phone photo over 10 MB was not supplied. The owner authorized deployment with this P1 acceptance item explicitly recorded.

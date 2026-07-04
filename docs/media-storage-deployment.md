# Bricky Media Storage Deployment Contract

Updated: 2026-07-05

## Purpose

Request photos, worker avatars, and worker gallery images must use one persistent directory that survives backend builds and PM2 restarts.

## Application Contract

- Backend public prefix: `/uploads/`
- Request files: `requests/`
- Worker avatars: `workers/`
- Worker gallery: `workers/gallery/`
- Database values remain public relative URLs such as `/uploads/requests/request_123_...jpg`.
- `backend/src/common/storage-paths.ts` is the only source of filesystem paths.
- `UPLOADS_DIR` may override the default storage root.
- Without `UPLOADS_DIR`, the stable fallback is `<backend>/uploads`, independent of the PM2 working directory.
- Backend startup fails immediately when the storage root cannot be read or written.

Production frontend uses `VITE_API_URL=/api`. Unless `VITE_ASSET_BASE_URL` is configured separately, `/uploads/...` database values are requested by the browser as `/api/uploads/...`. The nginx `/api/` proxy must therefore strip `/api/` and forward the remaining `/uploads/...` path to Nest.

## Recommended Production Layout

Use storage outside the Git checkout:

```text
/var/lib/bricky/uploads
  requests/
  workers/
    gallery/
```

Backend environment:

```dotenv
UPLOADS_DIR=/var/lib/bricky/uploads
```

MySQL port `3306` and the backend port should remain private. Only nginx should expose the public HTTPS routes.

## One-Time Server Preparation

Run as an operator with the correct server permissions. Replace `<BRICKY_OS_USER>` with the account that runs PM2.

```bash
sudo mkdir -p /var/lib/bricky/uploads/requests
sudo mkdir -p /var/lib/bricky/uploads/workers/gallery
sudo rsync -a /var/www/Bricky/backend/uploads/ /var/lib/bricky/uploads/
sudo chown -R <BRICKY_OS_USER>:<BRICKY_OS_USER> /var/lib/bricky/uploads
sudo chmod -R u+rwX,go-rwx /var/lib/bricky/uploads
```

Add `UPLOADS_DIR=/var/lib/bricky/uploads` to `/var/www/Bricky/backend/.env`, then restart the backend with updated environment variables:

```bash
cd /var/www/Bricky/backend
npm run build
pm2 restart bricky-backend --update-env
pm2 save
```

Do not delete the old `backend/uploads` directory until the smoke test and a backup both pass.

## Restart Persistence Smoke

Use a disposable staging client/request, not production customer data.

1. Upload one before image through the request API or UI.
2. Record only its returned public URL, for example `<MEDIA_URL>`.
3. Verify it before restart:

```bash
curl -fI "https://bricky.bg<MEDIA_URL>"
```

If the frontend resolves uploads through `/api`, test the effective browser URL instead:

```bash
curl -fI "https://bricky.bg/api<MEDIA_URL>"
```

4. Restart the backend:

```bash
pm2 restart bricky-backend --update-env
pm2 status bricky-backend
```

5. Repeat the exact same `curl` request. It must still return `200` with an image content type.
6. Open the request and worker portfolio in the browser. The image must render in both places.
7. Check that the file exists under the configured root:

```bash
find /var/lib/bricky/uploads -type f -name '<FILE_NAME>' -print
```

## Automated Evidence

- `storage-paths.spec.ts` verifies stable and configurable absolute paths.
- `storage-persistence.spec.ts` writes a file, closes the Nest application, starts a new instance, and retrieves the same `/uploads/...` resource.
- Guarded MySQL `app.e2e-spec.ts` now restarts the application after real before/after uploads and verifies both static files and hydrated worker history.

The MySQL E2E must only run against a disposable database whose name contains `sprint1`. It must never target production.

## Backup

Create a media archive before migration or cleanup:

```bash
sudo tar -czf "/root/bricky-uploads-$(date +%F-%H%M%S).tar.gz" -C /var/lib/bricky uploads
```

Keep the database backup from the same deployment window so file metadata and physical files can be restored together.

## Rollback

1. Stop changing media data during rollback.
2. Restore the previous `UPLOADS_DIR` value or remove it to use `<backend>/uploads`.
3. Restart PM2 with `--update-env`.
4. Verify one known pre-existing media URL.
5. Do not remove either storage copy until the rollback is confirmed.

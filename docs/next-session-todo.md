# Next Session TODO

## Highest Priority

- Production server is not stable yet:
  - opening a worker profile from `/workers` can break the page;
  - gallery thumbnails/photos are broken on `bricky.bg`;
  - browser console shows many `404` errors for `gallery_1011_...jpg` files;
  - `/api/workers/me/history` returns `404`;
  - fix production uploads/static file serving before polishing the UI further.
- DONE in dev/mock: request workflow is stable enough for local testing from both client and worker sides.
- DONE in dev/mock: changing worker profile settings no longer breaks the mock test profile.
- DONE in dev/mock: worker profile photo/avatar and public grid cards use the saved mock profile data.
- Continue removing remaining direct `axios` calls from pages that should go through the shared mock-aware API layer.
- Keep localStorage image usage low in dev/mock mode; use `Dev test` reset when old large image blobs already exist.

## Production Server Fixes

- Fix public worker profile navigation from the workers grid:
  - `/workers` card click should always open a valid worker profile route;
  - profile route must support the same id/userId shape returned by production `/api/workers`;
  - missing worker data should show a clean empty/error state, not break the page.
- Fix gallery image URLs on production:
  - inspect how gallery filenames are stored in the database;
  - serve uploaded files from a stable public path such as `/uploads/...`;
  - normalize frontend image URLs so raw filenames like `gallery_1011_...jpg` become valid asset URLs;
  - add `onError` fallback UI so broken files do not visually explode the gallery.
- Implement or remove `/api/workers/me/history`:
  - backend should expose completed worker history with before/after photos and duration;
  - or frontend should not call this endpoint in production until backend support exists.
- Add server smoke tests after deploy:
  - `curl https://bricky.bg/api/workers`;
  - `curl https://bricky.bg/api/workers/{id}`;
  - `curl https://bricky.bg/api/workers/me/history` with auth token when available;
  - open `/workers`, one public worker profile, and the worker gallery in browser.
- Clean up the server repository state:
  - remove accidental embedded `Bricky` repo from the server git index if it is still present;
  - avoid committing server-only merge commits back to `main` unless intentionally syncing live changes.

## Client Requests

- DONE in dev/mock: client can upload photos of the place/problem that needs repair from the `Направи заявка` form.
- Photos must appear:
  - DONE in dev/mock: in the client request details;
  - DONE in dev/mock: in the worker request feed/dashboard;
  - in any request preview/details view.
- Wire request photos to real backend file upload/storage instead of localStorage data URLs.
- Client should receive an approximate price estimate while creating the request.
- Estimate should use repair category, quantity/area/points, materials, and labor range.

## Worker Gallery

- DONE in dev/mock: workers can upload photos from completed/previous repairs.
- DONE in dev/mock: worker gallery accepts data URLs and can display them locally.
- DONE in dev/mock: closing a request can attach "after" photos and save before/after photos in worker history.
- DONE in dev/mock: completed objects are grouped into compact portfolio/CV-style albums with cover photos and a viewer for all images.
- DONE in dev/mock: public worker profile shows completed Bricky objects as proof of real work through the platform.
- URGENT for production: wire worker gallery and completed-job photos to real backend file upload/storage.
- Verify the same gallery/history behavior with production backend storage after upload endpoints are connected.
- Decide whether repair photos are:
  - general portfolio photos;
  - linked to a specific completed request;
  - or both.

## Worker Profiles

- DONE in dev/mock: worker profile avatar can be uploaded and saved.
- DONE in dev/mock: worker profile information can be edited and saved.
- DONE in dev/mock: `/workers` grid uses saved worker avatars and profile details.
- Wire avatar/profile save to real backend storage and verify persistence after server deploy.
- Add validation for profile fields so public profiles stay clean and professional.
- Add moderation/AI review for uploaded profile images and portfolio photos before they become public.

## Communication Rules

- Remove worker phone numbers from client-facing UI.
- Client-worker communication should happen through Bricky, not direct phone contact.
- Replace phone/contact blocks with Bricky messaging/contact request flow.

## Map Feature

- FEATURE BRANCH: `codex/feature-sofia-request-map`.
- DONE in dev/mock: worker-only `/repair-map` route.
- DONE in dev/mock: client accounts do not have access to the request map.
- DONE in dev/mock: worker menu/nav links expose the map only to workers.
- DONE in dev/mock: Sofia interactive slippy map with drag/pan and wheel zoom.
- DONE in dev/mock: scroll over the map zooms the map instead of scrolling the page.
- DONE in dev/mock: Payday 2 Crime.Net-inspired skin, toned down so streets remain readable.
- DONE in dev/mock: requests appear as map markers at realistic Sofia addresses.
- DONE in dev/mock: close requests cluster into a bubble with request count.
- DONE in dev/mock: clicking a cluster expands requests so they can be selected individually.
- DONE in dev/mock: hovering a request marker highlights it.
- DONE in dev/mock: clicking a request updates the right-side panel.
- DONE in dev/mock: request photos show in the right-side map details panel.
- DONE in dev/mock: workers can apply from the selected map request.
- NEXT: add real address geocoding for manually typed client addresses.
- NEXT: add production DB migration for request `latitude`, `longitude`, and `locationSource`.
- NEXT: decide map provider for production:
  - OpenStreetMap tiles;
  - Google Maps;
  - or paid commercial tile provider.
- NEXT: add category/status filters and category-specific marker icons.
- NEXT: add moderation/AI checks before requests appear on the worker map.

## Categories And Calculator

- Review and finalize category list:
  - repair roofs;
  - bathroom renovation;
  - full renovation;
  - electrical installation;
  - repainting;
  - light refresh renovation;
  - plus existing categories.
- Research approximate material and labor prices.
- Replace rough hardcoded estimates with a clearer pricing model:
  - per square meter;
  - per electrical/plumbing point;
  - fixed base fee;
  - difficulty multiplier;
  - optional material quality level.

## Cleanup

- Stabilize `DevTestPanel` and mock localStorage DB.
- Add a reset/seed explanation in docs or UI.
- Audit all changed pages for direct `axios` calls.
- Keep backend DTO/entity category enums aligned with frontend constants.
- Add a production deployment checklist:
  - backend env variables;
  - database migrations/schema sync;
  - upload storage path or object storage;
  - nginx/static frontend config;
  - PM2 backend restart;
  - smoke test for `/workers`, login, request creation, and worker profile.

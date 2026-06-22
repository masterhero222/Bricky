# Bricky Live Session Summary - 2026-06-21

## Scope

This session continued the Bricky AI integration and expanded the local development workflow so the app can be tested without a running MySQL backend. The work focused on request creation, client/worker role testing, AI request drafts, image upload mock flows, categories, and early pricing calculator structure.

## AI Request Draft Integration

- Added an authenticated client-only draft endpoint:
  - `POST /requests/draft`
  - DTO: `backend/src/requests/dto/request-draft.dto.ts`
- Added OpenAI Responses API support in `RequestsService`.
- Added a local fallback categorizer when `OPENAI_API_KEY` is missing or the OpenAI call fails.
- Added frontend Bricky AI helper UI in `CreateRequest.jsx`.
- Backend config note added to `backend/README.md`:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`

## Local Dev Auth And Testing

- Added dev login support:
  - `POST /auth/dev-login`
  - disabled when `NODE_ENV=production`
- Updated login pages to use the shared API client:
  - `Login.jsx`
  - `ClientLogin.jsx`
  - `WorkerLogin.jsx`
  - `Register.jsx`
- Added a global `DevTestPanel` for switching between local mock clients and workers.
- Added frontend mock API layer in `frontend/src/services/devMockApi.js`.
- Updated `frontend/src/services/api.js` to route API calls to the mock layer when using local dev tokens.

## Mock Workflow Added

The mock layer supports:

- Multiple test clients.
- Multiple test workers.
- Client request creation.
- Worker request feed.
- Worker apply flow.
- Client assign-worker flow.
- Worker complete-request flow.
- Completed request review flow.
- Worker profile/gallery mock data.

This allows testing core workflows even when the local backend cannot start because MySQL is unavailable.

## Request Categories

Expanded repair categories across frontend and backend validation/entity enum:

- `ВиК`
- `Електро`
- `Шпакловка и боя`
- `Плочки`
- `Ремонт на покриви`
- `Ремонт на бани`
- `Основен ремонт`
- `Електро инсталация`
- `Пребоядисване`
- `Освежителен ремонт`

Shared frontend catalog:

- `frontend/src/constants/repairCatalog.js`

## Client Request Photos

Started support for client-side request photos in dev/mock mode:

- Client can attach photos to a request from `ClientProfile`.
- Mock API stores request photos in localStorage.
- Client request list displays request photo thumbnails.
- Worker request cards display client-uploaded photos.

This is still a dev/mock implementation and should be connected to real backend upload/storage later.

## Worker Photos And Gallery

Added mock/dev support for:

- Worker profile avatar upload.
- Worker gallery upload.
- Worker gallery delete.
- Gallery images stored as localStorage data URLs.
- Worker preview can read worker gallery from mock data.

Known instability: worker profile save/upload mock flow has been fragile because some code paths still used direct `axios` calls instead of the shared mock-aware API client. This needs cleanup in the next session.

## Pricing Calculator

Added an initial shared rough-pricing catalog:

- `REPAIR_PRICE_PRESETS`
- `estimateRepairPrice(category, quantity)`

The calculator now aims to show:

- Materials estimate.
- Labor minimum/maximum.
- Total minimum/maximum.
- Unit type such as `кв.м` or `точка`.

This is intentionally rough and needs real pricing research and UX refinement.

## Map Concept

User requested a repair-activity map inspired by the Payday 2 Crime.Net style:

- Real map of Sofia/locations.
- Repair requests should appear as markers/cards on the map.
- Visual inspiration: Payday 2 job map with pop-up jobs, density, category icons, and urgency/status indicators.
- Communication and job discovery should feel active and live, but adapted to Bricky repair categories.

## Verification Done

- `frontend npm run build` passed after the latest fixes.
- `backend npm run build` passed after expanding backend categories.
- Vite live preview was restarted on `http://localhost:5173`.

## Important Caveats

- Local backend runtime still cannot fully run without MySQL.
- Dev/mock mode is temporary and should not become production behavior.
- Several older files still contain encoding/mojibake remnants; touched areas have partly normalized Bulgarian strings.
- Some UI paths still call `axios` directly; these are riskier in mock mode and should be migrated to the shared API service.

## Update - 2026-06-22

Additional request/photo workflow fixes were added after browser testing:

- Client request photo upload was moved into the actual `Направи заявка` form instead of being shown in the `Моите заявки` header.
- Client request photos now render in:
  - the client request list;
  - worker dashboard request cards;
  - the worker `Заявки` tab.
- Worker completion photos are attached when the worker closes a request.
- Worker history shows completed jobs with:
  - duration in days;
  - before photos from the client request;
  - after photos uploaded by the worker.
- Worker gallery rendering now accepts mock `data:image/...` URLs instead of converting them into broken backend URLs.
- Dev mock gallery upload now uses the mock path when logged in with a local dev token, avoiding `/workers/me/gallery` 404 errors during local testing.
- Mock photo normalization accepts direct string URLs/data URLs plus object shapes such as `{ url }`, `{ dataUrl }`, `{ imageUrl }`, and `{ path }`.
- Client and worker image uploads are downscaled before being stored in localStorage. This reduces `QuotaExceededError` during repeated local tests with real images.
- The mock DB write path now trims old gallery blobs if localStorage is already full, so closing a request does not fail only because old test images consumed the quota.

Testing note: if an existing browser session already contains large old base64 images in `bricky.dev.db`, use the `Dev test` reset before retesting the full request flow.

## Final Update - 2026-06-22

The last pass focused on making the worker profile usable as a sales/CV surface and keeping mock testing stable:

- Worker profile data now saves correctly in dev/mock mode:
  - profile photo/avatar;
  - name/company;
  - city;
  - description;
  - experience/specialization;
  - equipment/tools.
- The worker grid at `/workers` now uses real profile photos from the mock profile data instead of always showing the same placeholder image.
- Worker cards were updated to feel more like professional profiles:
  - circular avatar;
  - city and category chips;
  - number of completed Bricky objects;
  - short description;
  - direct link to the public profile.
- The worker gallery was reorganized from loose image cards into object/job albums:
  - each completed object is shown as a compact horizontal rounded card;
  - the card shows repair type, date, duration, and photo count;
  - only a few cover photos are shown in the card;
  - all photos are available through a modal/lightbox viewer.
- The public worker preview now shows completed Bricky objects as portfolio/CV entries instead of a heavy grid of unrelated photos.
- Completed request history keeps before/after context:
  - before photos from the client request;
  - after photos uploaded by the worker when closing the request;
  - duration in days.
- Client request photos continue to appear in both the client request view and the worker-side request cards.
- Dev/mock image handling was hardened so large local images are downscaled before saving and old gallery blobs can be trimmed if localStorage fills up.

Verification:

- Frontend build passed locally.
- Backend build passed locally.
- Local preview was run on `http://127.0.0.1:5173`.

Deployment note:

- The current version is intended to be committed, pushed to GitHub, and deployed to the server after this documentation update.

## Production Server Check - 2026-06-22

After deploying to the server, the local/dev mock flow looked good, but the production server still has real backend/static-file issues:

- `bricky.bg/workers` loads the workers grid, but opening a worker profile from the grid can break the public profile flow.
- The worker gallery on the server shows broken images instead of real thumbnails.
- Browser console shows many `404 Not Found` errors for gallery image files such as `gallery_1011_...jpg`.
- The worker profile/gallery page also shows `404 Not Found` for `/api/workers/me/history`.
- This means the frontend is now exposing the missing production wiring:
  - real uploaded files are not served from the paths stored in the database;
  - gallery URLs need backend/static asset normalization;
  - the production backend needs a real `/workers/me/history` endpoint or the frontend needs to stop calling it until it exists;
  - public worker preview must be hardened so missing photos/history never crash the profile.

Important: these issues are server/production integration problems, not the same as the dev/mock gallery flow that was stabilized locally.

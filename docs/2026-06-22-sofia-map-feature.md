# Bricky Sofia Request Map Feature - 2026-06-22

## Branch

Feature branch:

- `codex/feature-sofia-request-map`

Purpose:

- keep the repair-request map isolated from the final app until the feature is approved;
- make it easy to remove by not merging this branch, or by reverting the merge commit later.

## What Was Added

### Worker-Only Request Map

- Added `/repair-map` as a worker-only route.
- Client accounts should not access the map.
- The global navbar shows `Карта` only for worker accounts.
- The worker profile sidebar includes `Карта заявки`, which opens `/repair-map`.

### Sofia Slippy Map

- Added a local interactive Sofia map using OpenStreetMap tiles.
- The map supports:
  - drag/pan between Sofia neighborhoods;
  - mouse-wheel zoom;
  - `+ / -` zoom buttons;
  - scroll capture only while the mouse is over the map, so the page does not scroll accidentally.

### CrimeNet-Inspired Skin

- The visual direction is inspired by Payday 2 Crime.Net, adapted for Bricky:
  - subtle HUD frame;
  - light scan/grid overlay;
  - dark operational palette;
  - live request markers;
  - cluster bubbles for dense areas.
- The latest pass reduced the blue overlay and removed distracting horizontal HUD lines so street names remain readable.

### Request Markers And Clustering

- Repair requests appear as map markers.
- Nearby requests are grouped into a cluster bubble showing the number of requests.
- Clicking a cluster expands the requests around that area so they can be selected individually.
- Hovering a request marker makes it pop and reveals a compact card.
- Clicking a request updates the right-side details panel.

### Request Details On Click

The right panel shows:

- request id and category;
- status;
- created date;
- address;
- description;
- client name;
- attached request photos;
- apply button for worker accounts.

### Worker Apply From Map

- Workers can apply directly from the map through `POST /requests/:id/apply`.
- The map uses the existing mock-aware API layer, so local mock testing works.

### Mock Data

- Dev mock requests were moved to realistic Sofia locations:
  - `ул. Граф Игнатиев`;
  - `бул. Витоша`;
  - `ул. Цар Симеон`;
  - `ул. Козяк`;
  - `ул. Фредерик Жолио-Кюри`;
  - `бул. Черни връх`.
- Mock requests include sample photos from `frontend/public/media_files`.
- A mock DB seed version was added so old browser localStorage seed data migrates to the new Sofia map data.

### Request Location Fields

The request flow now carries location metadata:

- `latitude`;
- `longitude`;
- `locationSource`.

These are added in:

- frontend request creation;
- dev mock API;
- backend DTO.

Important production note:

- the live-safe version intentionally does not add `latitude`, `longitude`, or `locationSource` columns to the TypeORM `RequestEntity` yet;
- this lets the map branch deploy without a production DB migration;
- real production persistence for exact coordinates still needs a later DB migration.

## Files Changed

Frontend:

- `frontend/src/pages/RepairMap.jsx`
- `frontend/src/pages/ClientProfile.jsx`
- `frontend/src/pages/workers/WorkerProfile.jsx`
- `frontend/src/components/UI/Navbar.jsx`
- `frontend/src/App.jsx`
- `frontend/src/services/devMockApi.js`
- `frontend/src/utils/mapProjection.js`
- `frontend/src/utils/googleMapsLoader.js`
- `frontend/.env.example`

Backend:

- `backend/src/requests/dto/create-request.dto.ts`
- `backend/src/requests/entities/request.entity.ts`
- `backend/src/requests/requests.controller.ts`
- `backend/src/requests/requests.service.ts`

## Verification

Passed locally:

- `cd frontend && npm run build`
- `cd backend && npm run build`

Local test URL:

- `http://127.0.0.1:5173/repair-map`

## Known Follow-Ups

- Add real geocoding for manually typed addresses.
- Replace mock sample image paths with real uploaded request photos in production.
- Add production DB migration for location columns before exact production coordinate persistence.
- Decide whether production should use:
  - OpenStreetMap tiles;
  - Google Maps;
  - or a paid tile provider with stable terms for commercial use.
- Add category-specific marker icons.
- Add filters by repair category/status/urgency.
- Add moderation/AI checks before requests appear publicly to workers.

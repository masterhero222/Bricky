# Bricky Mock Database / Local Dev Storage

## Summary

The current mock environment does not use MySQL, SQLite, or a separate mock backend process.

The mock "database" is a browser `localStorage` JSON object managed by the frontend file:

`frontend/src/services/devMockApi.js`

The storage key is:

`bricky.dev.db`

This mock DB is used only in Vite development mode (`import.meta.env.DEV`) and is intended for local UI and workflow testing.

## How To Run The Mock Environment

From the repository root:

```powershell
cd "C:\projects\Bricky Live\frontend"
npm install
npm run dev
```

Vite usually starts on:

```text
http://127.0.0.1:5173/
```

If port `5173` is occupied, Vite may start on the next available port, for example:

```text
http://127.0.0.1:5174/
```

The mock DB is browser-specific and origin-specific. This means `127.0.0.1:5173`, `127.0.0.1:5174`, and `localhost:5173` each have separate localStorage.

## How Mock Mode Is Activated

Mock API calls are routed through:

`frontend/src/services/api.js`

The wrapper functions are:

- `apiGet`
- `apiPost`
- `apiPut`
- `apiDelete`

They call `mockRequest()` from `frontend/src/services/devMockApi.js` when the app is running in development and one of these is true:

- the token starts with `local-dev-token`;
- the endpoint is `/auth/dev-login`;
- the endpoint is `/repair-categories`;
- the endpoint is `/workers`;
- the endpoint matches `/workers/:id`.

The mock token is stored in:

```text
localStorage.token
```

Example token shapes:

```text
local-dev-token-client-101
local-dev-token-worker-201
```

## How To Access The Mock Database

Open the app in Chrome, then:

1. Open DevTools.
2. Go to `Application`.
3. Open `Local Storage`.
4. Select the current origin, for example `http://127.0.0.1:5174`.
5. Find the key:

```text
bricky.dev.db
```

The value is a JSON object containing the whole mock DB.

You can also inspect it from the browser console:

```js
JSON.parse(localStorage.getItem("bricky.dev.db"))
```

To export it:

```js
copy(JSON.stringify(JSON.parse(localStorage.getItem("bricky.dev.db")), null, 2))
```

To fully delete the mock DB:

```js
localStorage.removeItem("bricky.dev.db")
location.reload()
```

On next load, `devMockApi.js` will reseed it from `seedDb()`.

## Reset Through The UI

The app has a floating `Dev тест` button in development mode.

Source:

`frontend/src/components/DevTestPanel.jsx`

The panel can:

- switch to a mock client account;
- switch to a mock worker account;
- reset the mock DB by calling `resetDevDb()`.

Reset function:

```js
resetDevDb()
```

Source:

`frontend/src/services/devMockApi.js`

Reset rewrites `localStorage["bricky.dev.db"]` with the output of `seedDb()`.

## Main Mock DB Shape

The seeded DB object has this structure:

```js
{
  mapSeedVersion: 4,
  nextRequestId: 7,
  nextReviewId: 1,
  repairCategories: [],
  clients: [],
  workers: [],
  reviews: [],
  requests: []
}
```

## Seeded Users

Clients are seeded in `CLIENTS` inside:

`frontend/src/services/devMockApi.js`

Current client ids:

- `101`
- `102`
- `103`

Workers are seeded in `WORKERS`.

Current worker records have both:

- `id`: worker profile id;
- `userId`: auth/user id used by login/session logic.

Current seeded worker user ids:

- `201`
- `202`
- `203`

This distinction matters because parts of the app still mix `worker.id` and `worker.userId`. That is a known architecture issue and should be cleaned up during the real DB redesign.

## Request Shape

Mock requests are stored under:

```js
db.requests
```

Common fields:

```js
{
  id: 1,
  clientUserId: 101,
  clientName: "...",
  email: "...",
  phone: "...",
  address: "...",
  latitude: 42.690781,
  longitude: 23.326193,
  locationSource: "seed",
  category: "ВиК",
  description: "...",
  status: "нова",
  photos: [],
  beforePhotos: [],
  afterPhotos: [],
  appliedWorkers: [],
  assignedWorkerId: null,
  completedAt: null,
  completedByWorkerId: null,
  durationDays: null,
  created_at: "..."
}
```

Important legacy fields:

- `appliedWorkers` is currently an array of worker user ids.
- `photos`, `beforePhotos`, and `afterPhotos` are JSON arrays.
- In the real backend redesign these should move to `request_applications` and `request_images`.

## Worker Shape

Mock workers are stored under:

```js
db.workers
```

Common fields:

```js
{
  id: 1,
  userId: 201,
  role: "worker",
  fullName: "...",
  name: "...",
  email: "...",
  phone: "...",
  city: "...",
  skills: [],
  description: "...",
  experience: "...",
  equipment: "...",
  avatarUrl: "",
  gallery: [],
  completedJobs: []
}
```

Worker avatar and gallery uploads are stored as data URLs in localStorage during mock testing.

This is convenient for local testing but can hit browser storage limits. Production must use real file upload/storage.

## Important Mock Endpoints

Implemented in:

`frontend/src/services/devMockApi.js`

Auth/dev:

- `POST /auth/dev-login`

User/profile:

- `GET /client/me`
- `GET /workers/me`
- `GET /workers`
- `GET /workers/:id`

Worker media/history:

- `GET /workers/:id/gallery`
- `GET /workers/me/gallery`
- `POST /workers/me/gallery/:imageId/delete`
- `GET /workers/me/history`
- `GET /workers/:id/history`

Requests:

- `POST /requests/draft`
- `GET /requests/client`
- `GET /requests/map`
- `GET /requests/worker`
- `GET /requests/worker/completed`
- `POST /requests`
- `POST /requests/:id/apply`
- `POST /requests/:id/assign`
- `POST /requests/:id/complete`

Reviews:

- `GET /reviews/client`
- `GET /reviews/worker/:id`
- `POST /reviews`

Repair categories:

- `GET /repair-categories`

## Request Lifecycle In Mock Mode

Client creates request:

```text
POST /requests
```

The mock handler:

- requires current role to be `client`;
- increments `db.nextRequestId`;
- stores request in `db.requests`;
- stores uploaded photos in `photos` and `beforePhotos`;
- sets status to `нова`.

Worker applies:

```text
POST /requests/:id/apply
```

The mock handler:

- requires current role to be `worker`;
- adds the worker user id to `request.appliedWorkers`;
- sets status to `кандидатствана`.

Client assigns worker:

```text
POST /requests/:id/assign
```

The mock handler:

- requires current role to be `client`;
- verifies the request belongs to the current client;
- verifies the worker exists in `appliedWorkers`;
- sets `assignedWorkerId`;
- sets status to `в процес`.

Worker completes request:

```text
POST /requests/:id/complete
```

The mock handler:

- requires current role to be `worker`;
- verifies `assignedWorkerId` matches the current worker;
- sets status to `завършена`;
- stores `afterPhotos`;
- computes `durationDays`;
- adds a completed job to the worker profile;
- copies before/after photos into the worker gallery.

## Repair Categories

Repair category constants live in:

`frontend/src/constants/repairCatalog.js`

The mock DB copies them into:

```js
db.repairCategories
```

The app reads them through:

```text
GET /repair-categories
```

This is mock-first. Production should eventually read categories from a real `repair_categories` table.

## Media And Photos

Mock seeded photos often point to public frontend paths such as:

```text
/media_files/banq.jpg
/media_files/banq2.jpg
/media_files/images.jpg
```

Uploaded photos are compressed in the browser and stored as base64 JPEG data URLs using:

```js
fileToDataUrl(file, maxSize = 900, quality = 0.72)
```

This is handled in:

`frontend/src/services/devMockApi.js`

Known limitation:

- localStorage has limited capacity;
- large or many photos can trigger `QuotaExceededError`;
- `writeDb()` attempts to recover by trimming worker galleries;
- production should never store large image blobs in DB/localStorage.

## Mock DB Migration Behavior

`readDb()` automatically seeds or lightly migrates localStorage.

Current behavior:

- if `bricky.dev.db` does not exist, `seedDb()` creates it;
- if `mapSeedVersion` is older than expected, seeded map requests/categories can be refreshed;
- old localStorage data may be partially preserved during migration.

If testing gets confusing, use the UI reset or manually remove `bricky.dev.db`.

## Known Problems / Architecture Notes

The mock DB intentionally mirrors some legacy production problems so the UI can keep working during transition:

- request candidates are still stored in `request.appliedWorkers`;
- request photos are still stored directly on request objects;
- worker id and user id are both present and can be confused;
- statuses are Bulgarian display strings instead of stable machine constants;
- categories are display labels in some places and keys in others;
- uploaded images are data URLs in localStorage.

The intended real DB direction is:

- `users`
- `worker_profiles`
- `repair_categories`
- `requests`
- `request_applications`
- `request_images` or shared `media_assets`
- `worker_completed_jobs` / request history
- `reviews`
- `notifications`

## Useful Console Commands

Inspect DB:

```js
const db = JSON.parse(localStorage.getItem("bricky.dev.db"));
db
```

List requests:

```js
JSON.parse(localStorage.getItem("bricky.dev.db")).requests
```

List workers:

```js
JSON.parse(localStorage.getItem("bricky.dev.db")).workers
```

Clear mock DB:

```js
localStorage.removeItem("bricky.dev.db");
location.reload();
```

Force client identity:

```js
localStorage.setItem("token", "local-dev-token-client-101");
localStorage.setItem("role", "client");
localStorage.setItem("userId", "101");
location.href = "/client/profile";
```

Force worker identity:

```js
localStorage.setItem("token", "local-dev-token-worker-201");
localStorage.setItem("role", "worker");
localStorage.setItem("userId", "201");
location.href = "/worker/profile";
```

Export DB JSON:

```js
copy(JSON.stringify(JSON.parse(localStorage.getItem("bricky.dev.db")), null, 2));
```

Import DB JSON:

```js
localStorage.setItem("bricky.dev.db", JSON.stringify(YOUR_DB_OBJECT));
location.reload();
```

## Important Warning

This mock DB is not shared between browsers, devices, ports, or domains.

It is only a local browser test fixture. It is useful for frontend workflow testing, but it is not a reliable source of truth for production data modeling.

# Bricky Database Systems Audit

Date: 2026-06-23

Purpose: document every current Bricky system that reads from, writes to, or depends on database-backed data, so it can be reviewed by another AI or engineer before the next architecture step.

## Executive Summary

Bricky currently uses a NestJS backend with TypeORM and MySQL.

The application database stores:

- users and authentication accounts;
- worker profile records;
- repair requests and their lifecycle state;
- request photos stored as JSON values;
- worker gallery image metadata;
- reviews/ratings;
- notifications.

The frontend also has a separate local development/mock database stored in browser `localStorage` under `bricky.dev.db`. That mock database simulates users, workers, requests, reviews, galleries, completed jobs, and map data. It is useful for local testing, but it is not the same storage model as production.

Current biggest design issue: the app mixes several identity concepts:

- `users.id`: the real account id used in JWT tokens;
- `worker.id`: the primary key in the `worker` table;
- `worker.userId`: the link back to `users.id`.

The code tries to work around this with "smart" lookup methods, but this is still the main source of routing/profile/grid bugs.

Current biggest data issue: production stores request photos as JSON/data URLs or URL objects in `requests.photos`, while worker avatar/gallery images use real file uploads and file paths under `/uploads`. These two image systems should be unified.

## Database Configuration

Backend database connection is configured in:

- `backend/src/app.module.ts`

TypeORM config:

```ts
TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  autoLoadEntities: true,
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
})
```

Important notes:

- The app uses MySQL.
- Entities are auto-loaded.
- Schema sync is controlled by `TYPEORM_SYNCHRONIZE`.
- In production, `TYPEORM_SYNCHRONIZE` should stay `false`.
- Changes to entities should be deployed with migrations, not automatic sync.

Backend bootstrapping is in:

- `backend/src/main.ts`

It also serves uploaded files:

```ts
app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
```

The uploads directory is:

```txt
backend/uploads
```

Production should ensure nginx also forwards or serves `/uploads/*` correctly.

## Tables And Entities

### `users`

Entity:

- `backend/src/users/user.entity.ts`

Columns:

```txt
id            primary generated id
name          user display name
email         unique email
password      bcrypt password hash
role          client | worker
```

Relations:

- `users.id` has `OneToMany` relation to `requests.client`.

Used by:

- authentication;
- JWT identity;
- client requests ownership;
- worker account identity through `worker.userId`.

Concerns:

- Password hashes are correctly stored through bcrypt.
- `role` is a plain string, not an enum.
- There is no explicit created/updated timestamp on users.

### `worker`

Entity:

- `backend/src/workers/worker.entity.ts`

Columns:

```txt
id             worker table primary key
userId         users.id, unique, required
fullName       public profile name
email          nullable, unique
password       nullable, legacy
phone          nullable
city           nullable
skills         simple-array
description    profile text
experience     profile text
equipment      profile text
avatarUrl      uploaded avatar URL/path
isApproved     approval flag
createdAt      created timestamp
```

Used by:

- worker profile page;
- public workers grid;
- public worker preview;
- worker gallery/history lookups;
- registration of worker profiles after creating a `users` row.

Concerns:

- `worker.userId` is only a numeric column, not a TypeORM relation to `users`.
- `worker.email` and `worker.password` are legacy leftovers and duplicate account data from `users`.
- `phone` is still stored and displayed in some UI, even though the product direction is to keep communication inside Bricky.
- `skills` uses `simple-array`, which is fragile if skill names include commas and is hard to query/filter.
- There is no updated timestamp.

Recommended next step:

- Keep `users` as the account table.
- Treat `worker.userId` as the public worker id until a cleaner model exists.
- Later migrate `worker.userId` into a real relation.
- Remove or stop using `worker.password`.
- Hide or remove public phone output.

### `worker_gallery_images`

Entity:

- `backend/src/workers/worker-gallery-image.entity.ts`

Columns:

```txt
id           primary key
userId       users.id of worker
url          image path, usually /uploads/workers/gallery/...
created_at   created timestamp
```

Used by:

- worker profile gallery;
- public worker preview;
- worker grid gallery summary through `withGallerySummary`.

Concerns:

- Database stores only URL metadata; files are on local server disk.
- Delete removes the DB row but does not remove the physical file from disk.
- No image moderation/status fields.
- No album/job relation yet.
- No type field for before/after/portfolio.

Recommended next step:

- Add `requestId`, `kind`, `caption`, `sortOrder`, and `isApproved` fields.
- Delete physical files when deleting DB records.
- Consider object storage later if deployment grows beyond one server.

### `requests`

Entity:

- `backend/src/requests/entities/request.entity.ts`

Columns:

```txt
id                   primary key
clientId             relation to users.id, nullable
clientName           copied client name
email                copied client email
phone                copied client phone
address              repair address
category             repair category
description          request description
photos               simple-json
beforePhotos         simple-json
afterPhotos          simple-json
status               enum
appliedWorkers       simple-array of worker user ids
assignedWorkerId     users.id of selected worker
completedAt          completion datetime
completedByWorkerId  users.id of worker that completed
durationDays         calculated duration
created_at           created timestamp
```

Status values are currently stored as mojibake Bulgarian strings in code:

```txt
нова
кандидатствана
назначена
в процес
завършена
отказана
```

In the source they appear as garbled text because some files were saved/read with the wrong encoding.

Used by:

- client request creation;
- client request list;
- worker feed;
- worker map;
- worker apply/complete actions;
- client assign/review actions;
- worker history/CV proof of completed work.

Concerns:

- `assignedWorkerId`, `completedByWorkerId`, and `appliedWorkers` store worker account ids as raw numbers, not relations.
- `appliedWorkers` uses `simple-array`; this is hard to query, hard to index, and fragile.
- Request photos are stored as JSON, often data URLs from the browser. This can make DB rows huge and slow.
- Location fields exist in DTO/frontend/mock, but not in the production `RequestEntity` yet. Production exact coordinates are not persisted unless columns are added.
- The request status enum is localized display text, not stable machine constants.
- `phone` is still stored in request records even though the product direction is Bricky-only communication.

Recommended next step:

- Introduce machine-safe status constants, for example `new`, `applied`, `assigned`, `in_progress`, `completed`, `canceled`.
- Add a join table for request applications instead of `simple-array`.
- Move photos into a `request_images` table with uploaded file paths.
- Add DB columns for `latitude`, `longitude`, and `locationSource` through a migration when the map feature is approved.
- Add indexes on `clientId`, `assignedWorkerId`, `completedByWorkerId`, `status`, `category`, and `created_at`.

### `reviews`

Entity:

- `backend/src/reviews/entities/review.entity.ts`

Columns:

```txt
id                   primary key
requestId            request id
workerUserId         users.id of reviewed worker
clientUserId         users.id of reviewing client
rating               integer 1..5
comment              optional text
created_at           created timestamp
completedAt          nullable, currently odd duplication
completedByWorkerId  nullable, currently odd duplication
```

Unique index:

```txt
requestId + clientUserId
```

Used by:

- client rating after completed request;
- worker rating display;
- worker profile/public preview.

Concerns:

- `requestId`, `workerUserId`, and `clientUserId` are plain ints, not TypeORM relations.
- `completedAt` and `completedByWorkerId` appear duplicated from requests and are not populated in review creation.
- No index on `workerUserId` except the unique compound index on request/client.

Recommended next step:

- Remove duplicated completion fields or deliberately populate them.
- Add indexes for `workerUserId` and `clientUserId`.
- Add foreign keys or at least consistent service-level constraints.

### `notifications`

Entity:

- `backend/src/notifications/notification.entity.ts`

Columns:

```txt
id          primary key
userId      users.id recipient
type        notification type
message     text
requestId   optional request id
isRead      boolean
createdAt   created timestamp
```

Used by:

- notification service;
- `GET /notifications/me`;
- `POST /notifications/:id/read`.

Current state:

- Service exists and works.
- Some request notification calls are commented out in `RequestsService`.

Concerns:

- No relation to users or requests.
- Notification creation is not consistently wired into request lifecycle.
- No cleanup/retention policy.

## Backend Systems

### Authentication

Files:

- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/users/users.service.ts`

Endpoints:

```txt
POST /auth/register
POST /auth/login
POST /auth/dev-login
POST /auth/register-client
POST /auth/register-worker
```

Registration flow:

1. Check `users.email`.
2. Hash password with bcrypt.
3. Create `users` row.
4. If role is `worker`, create a linked `worker` row with `userId = users.id`.

Login flow:

1. Find user by email in `users`.
2. Compare bcrypt hash.
3. Return JWT with:

```txt
id: users.id
role: users.role
```

Concerns:

- JWT secret falls back to `supersecretkey` if `JWT_SECRET` is missing.
- `dev-login` is blocked only when `NODE_ENV === 'production'`.
- There are duplicate/legacy register endpoints.
- Worker passwords also exist in `worker.password` for legacy flow.

Recommended next step:

- Require `JWT_SECRET`; fail boot if missing in production.
- Remove legacy worker standalone registration or isolate it from production.
- Standardize on `POST /auth/register`.

### Request Lifecycle

Files:

- `backend/src/requests/requests.controller.ts`
- `backend/src/requests/requests.service.ts`
- `backend/src/requests/entities/request.entity.ts`

Endpoints:

```txt
POST /requests/draft
POST /requests
GET /requests/client
GET /requests/map
GET /requests/worker
GET /requests/worker/completed
POST /requests/:id/apply
POST /requests/:id/assign
POST /requests/:id/unassign
POST /requests/:id/complete
```

Client creates request:

1. JWT role must be `client`.
2. Frontend sends client info, address, category, description, photos.
3. Backend creates `requests` row.
4. `photos` and `beforePhotos` are normalized into JSON.
5. Status starts as `new`.

Worker applies:

1. JWT role must be `worker`.
2. Worker `users.id` is added to `appliedWorkers`.
3. Status moves to `applied` if it was new.

Client assigns worker:

1. JWT role must be `client`.
2. Backend checks request belongs to client.
3. Backend checks worker is in `appliedWorkers`.
4. `assignedWorkerId` is set to worker `users.id`.
5. Status becomes `in process`.

Worker completes:

1. JWT role must be `worker`.
2. Backend checks `assignedWorkerId === req.user.id`.
3. Status becomes completed.
4. `completedAt`, `completedByWorkerId`, `afterPhotos`, and `durationDays` are saved.

Known gaps:

- No request cancellation endpoint exposed.
- No uploaded-file storage for request photos.
- No separate request applications table.
- No transaction around multi-step lifecycle updates.
- No notification is currently sent because notification calls are commented out.

### Worker Profiles

Files:

- `backend/src/workers/workers.controller.ts`
- `backend/src/workers/workers.service.ts`

Endpoints:

```txt
GET /workers
POST /workers/by-user-ids
GET /workers/me
PUT /workers/me
POST /workers/me/avatar
GET /workers/me/gallery
POST /workers/me/gallery
POST /workers/me/gallery/:id/delete
GET /workers/me/history
GET /workers/:userId
GET /workers/:userId/gallery
GET /workers/:userId/history
```

Worker profile behavior:

- `GET /workers/me` finds profile by `worker.userId = JWT users.id`.
- If profile is missing, it creates a new worker profile.
- `PUT /workers/me` updates public profile text fields.
- Avatar upload writes a file to `uploads/workers` and stores `/uploads/workers/...` in `worker.avatarUrl`.

Public workers behavior:

- `GET /workers` returns all worker rows, each expanded with:
  - `gallery`;
  - `completedJobs`.
- `GET /workers/:userId` uses smart lookup: first tries `worker.userId`, then `worker.id`.

Concerns:

- `GET /workers` can become expensive because each worker triggers gallery and history queries.
- Public route naming says `:userId`, but smart lookup also accepts `worker.id`; this prevents crashes but hides the data model confusion.
- Gallery delete removes only DB metadata, not the physical uploaded file.
- File upload has type and size checks, but no image scanning/moderation.

Recommended next step:

- For the public grid, create a lightweight endpoint that returns only card data and counts, not full galleries/history.
- Add a dedicated public identifier strategy: either always `users.id` or always `worker.id`, not both.
- Add DB indexes for `worker.userId` and `worker_gallery_images.userId` already exist; keep them.

### Worker Gallery And Completed Work History

Gallery source:

- `worker_gallery_images` table.
- Uploaded files under `/uploads/workers/gallery`.

Completed work history source:

- `requests` table, where:
  - `assignedWorkerId` is worker `users.id`; or
  - `completedByWorkerId` is worker `users.id`;
  - and request is completed.

Public profile display:

- Prefer completed request albums if available.
- Fall back to loose gallery photos if no completed jobs exist.

Concerns:

- Completed request photos are not automatically converted into `worker_gallery_images`.
- There are two systems: loose portfolio photos and request completion photos.
- The product goal is "real Bricky CV", so completed requests should probably be first-class portfolio objects.

Recommended next step:

- Create a `worker_portfolio_items` or `request_images` model.
- Link photos to a request and worker.
- Keep loose gallery uploads separate as "manual portfolio", with moderation.

### Reviews And Ratings

Files:

- `backend/src/reviews/reviews.controller.ts`
- `backend/src/reviews/reviews.service.ts`

Endpoints:

```txt
POST /reviews
GET /reviews/client
GET /reviews/worker/:workerUserId
```

Behavior:

- Only clients can create reviews.
- Backend verifies request ownership.
- Backend only allows reviews for completed requests.
- One review per request/client is enforced by a unique index.
- Worker profile rating is calculated by fetching all reviews for `workerUserId`.

Concerns:

- `workerUserId` is raw `users.id`.
- No pagination.
- Average is computed in application code, not by SQL aggregation.

Recommended next step:

- Add indexes and use SQL aggregate for public worker rating summary.
- Consider denormalized rating counters on `worker` if performance becomes an issue.

### Notifications

Files:

- `backend/src/notifications/notifications.controller.ts`
- `backend/src/notifications/notifications.service.ts`

Endpoints:

```txt
GET /notifications/me
POST /notifications/:id/read
```

Current state:

- DB support exists.
- Request lifecycle integration is currently incomplete/commented.

Recommended next step:

- Trigger notifications on:
  - worker applies;
  - client assigns worker;
  - worker completes request;
  - client reviews.

### Bricky AI Draft System

File:

- `backend/src/requests/requests.service.ts`

Endpoint:

```txt
POST /requests/draft
```

Behavior:

- Client sends prompt and optional address.
- Backend uses OpenAI Responses API if `OPENAI_API_KEY` exists.
- If OpenAI fails or is missing, it returns a local heuristic draft.
- It does not save to database by itself.

Database impact:

- No direct write until the client submits the real request through `POST /requests`.

Concerns:

- Category list is still small in the AI draft prompt.
- Encoding issues are visible in prompt strings.
- The output should align with the final repair category catalog.

### Map Feature

Files:

- `frontend/src/pages/RepairMap.jsx`
- `backend/src/requests/requests.controller.ts`
- `backend/src/requests/requests.service.ts`

Endpoint:

```txt
GET /requests/map
```

Current backend behavior:

- If JWT role is `client`, returns that client's own requests.
- If JWT role is `worker`, returns worker feed.

Current product intent:

- The map should be worker-only in UI.

Current production limitation:

- Frontend/mock request objects contain `latitude`, `longitude`, and `locationSource`.
- Backend DTO accepts these fields.
- Production `RequestEntity` does not currently persist these fields.
- Therefore exact live map coordinates cannot persist until a DB migration adds these columns.

Recommended next step:

- Add migration:

```txt
requests.latitude DECIMAL(10, 7) NULL
requests.longitude DECIMAL(10, 7) NULL
requests.locationSource VARCHAR(50) NULL
```

- Decide whether geocoding is done:
  - in frontend via Google Maps API;
  - in backend via Google Maps/Geocoding API;
  - or manually at first.

## Frontend Systems That Depend On Database-Backed APIs

### Shared API Layer

Files:

- `frontend/src/services/api.js`
- `frontend/src/utils/mediaUrls.js`

Behavior:

- Uses `VITE_API_URL`, falling back to `/api`.
- Adds Bearer token from `localStorage`.
- In dev mode, some calls are redirected to the mock API if a local dev token is active.

Important localStorage keys:

```txt
token
accessToken
access_token
role
userId
userName
bricky.dev.db
```

Concerns:

- Auth state is spread across localStorage keys and a small AuthContext.
- The dev mock API only intercepts some endpoints depending on URL and token.
- Some multipart uploads still use direct `axios.post` because they need `FormData`.

### Client Profile

File:

- `frontend/src/pages/ClientProfile.jsx`

Uses:

```txt
GET /requests/client
GET /reviews/client
POST /workers/by-user-ids
GET /workers
POST /requests
POST /requests/:id/assign
POST /reviews
```

Also attempts:

```txt
GET /client/me
```

Note: no `client/me` backend controller exists in the current backend. The frontend catches this failure, so it is optional/fallback behavior.

Client profile responsibilities:

- show client requests;
- create request;
- attach request photos;
- request browser geolocation;
- assign a worker;
- submit review after completion.

Concerns:

- Request photos are converted to browser data URLs and sent into the request JSON body.
- Geolocation fields are sent but not persisted by production entity yet.
- Client personal data is duplicated into each request row.

### Worker Profile

File:

- `frontend/src/pages/workers/WorkerProfile.jsx`

Uses:

```txt
GET /requests/worker
GET /requests/worker/completed
GET /workers/me/history
GET /reviews/worker/:myUserId
GET /workers/me
POST /requests/:id/complete
POST /requests/:id/apply
PUT /workers/me
POST /workers/me/avatar
GET /workers/me/gallery
POST /workers/me/gallery
POST /workers/me/gallery/:id/delete
```

Worker profile responsibilities:

- dashboard metrics;
- view/apply to requests;
- complete assigned request with after photos;
- edit profile;
- upload avatar;
- upload/delete gallery photos;
- approximate calculator.

Concerns:

- After photos for completed requests are still JSON/data URL photos, not uploaded files.
- Gallery photos are uploaded files.
- The calculator is local-only and not database-backed.
- `axios.post` is used directly for multipart uploads.

### Public Workers Grid

File:

- `frontend/src/pages/workers/Workers.jsx`

Uses:

```txt
GET /workers
```

Displays:

- avatar;
- name;
- city;
- first skill;
- completed Bricky object count;
- profile description.

Concerns:

- The grid depends on `GET /workers` returning enriched data.
- This may become slow when many workers exist because backend loads gallery/history per worker.
- Cards navigate to `/workers/${w.userId || w.id}`.

### Public Worker Preview

File:

- `frontend/src/pages/workers/WorkerPreview.jsx`

Uses:

```txt
GET /workers/:userId
GET /workers/:userId/gallery
GET /workers/:userId/history
GET /reviews/worker/:userId
POST /requests/:requestId/assign
```

Displays:

- profile;
- rating;
- gallery/completed job albums;
- equipment;
- selection/assignment controls.

Concerns:

- Phone is still displayed in public profile.
- It accepts `id`/`userId` ambiguity from route params.

### Repair Map

File:

- `frontend/src/pages/RepairMap.jsx`

Uses:

```txt
GET /requests/map
POST /requests/:id/apply
```

Displays:

- Sofia map;
- request markers/clusters;
- request details;
- request photos;
- apply from map.

Concerns:

- Production coordinate persistence is not active yet.
- If production requests lack latitude/longitude, map markers fall back to Sofia center or cannot represent the real address accurately.

## Local Mock Database

File:

- `frontend/src/services/devMockApi.js`

Storage key:

```txt
bricky.dev.db
```

Mock DB contains:

```txt
clients
workers
requests
reviews
completedJobs
gallery
map seed data
```

Used when:

- frontend is in dev mode;
- token starts with `local-dev-token`;
- selected endpoints are intercepted by `api.js`.

Good:

- Enables testing client and worker workflows without production backend.
- Includes local request photos, worker photos, completed jobs, and map coordinates.

Risk:

- Mock storage model differs from production.
- It can hide backend/storage problems until deployment.
- Large data URLs in localStorage can exceed quota.

## Main Problems Found

### 1. `users.id`, `worker.id`, and `worker.userId` are mixed

Impact:

- Profile routes can break.
- Public grid can open the wrong identifier.
- Assignment/reviews expect worker `users.id`, not worker table `id`.

Current mitigation:

- `findOneSmart()` tries both `worker.userId` and `worker.id`.

Better fix:

- Pick a canonical public worker id and document it.
- Prefer `users.id` for auth-bound worker operations and expose it as `workerUserId`.
- Keep `worker.id` internal.

### 2. Request photos and gallery photos use different storage models

Impact:

- Request photos can bloat database rows.
- Gallery photos can 404 if files are missing or static serving is wrong.
- Completed job CV/portfolio logic has to merge different photo shapes.

Better fix:

- Add a real image table and upload endpoint for request photos.
- Store file paths, not base64 data URLs, in production DB.

### 3. Request applications use `simple-array`

Impact:

- Hard to query/filter/index.
- Hard to store application timestamps/status/messages.
- Fragile if IDs are malformed.

Better fix:

Create table:

```txt
request_applications
id
requestId
workerUserId
status
createdAt
updatedAt
```

### 4. Status/category values are display strings

Impact:

- Hard to compare reliably.
- Encoding issues create mojibake in source.
- Harder for external AI/tools to reason about.

Better fix:

- Store machine constants in DB.
- Translate to Bulgarian in frontend.

### 5. Production map coordinates are not persisted yet

Impact:

- Live map cannot reliably place new requests at exact addresses.

Better fix:

- Add migration for latitude/longitude/locationSource.
- Add geocoding pipeline.

### 6. `GET /workers` is too heavy for scale

Impact:

- For every worker, backend loads gallery and history.
- This is okay for MVP but not for many workers.

Better fix:

- Add `GET /workers/cards` or optimize `GET /workers` with aggregate queries.

### 7. Security hardening needed

Issues:

- JWT secret fallback exists.
- MySQL and uploads depend on server filesystem.
- No moderation/scanning for uploaded images.
- Dev login should be impossible in production.

Better fix:

- Fail boot if `JWT_SECRET` is missing in production.
- Add upload moderation/validation.
- Add operational backup and migration discipline.

## Recommended Next Architecture Step

For the next major cleanup, focus on the request/photo/map data model:

1. Add migrations instead of relying on TypeORM sync.
2. Add request coordinates:

```txt
requests.latitude
requests.longitude
requests.locationSource
```

3. Add request image table:

```txt
request_images
id
requestId
uploadedByUserId
workerUserId nullable
kind: before | after | general
url
caption nullable
isApproved boolean
createdAt
```

4. Add request applications table:

```txt
request_applications
id
requestId
workerUserId
status
createdAt
updatedAt
```

5. Keep `requests` focused on core request metadata and lifecycle.
6. Keep uploaded files out of JSON columns.
7. Normalize worker public profile data and use one canonical worker public id.

## Questions For External AI Review

Use these questions when consulting another AI:

1. Should Bricky use `users.id` or `worker.id` as the canonical public worker identifier?
2. What is the best migration path from `requests.photos` JSON to a `request_images` table without losing existing production photos?
3. Should request applications become a join table before adding chat/offers/pricing?
4. Should statuses/categories be migrated from Bulgarian strings to machine constants now?
5. Should map geocoding happen in frontend or backend?
6. Should uploaded images stay on VPS disk or move to object storage?
7. What indexes are needed for worker map/feed performance?
8. How should moderation/AI review fit before photos and requests become public to workers?


# Sprint 1 Canonical Request Contracts

Updated: 2026-07-04

Status: accepted for Sprint 1 stabilization. These contracts describe the target behavior while compatibility fields are still present.

## Actor Identity

### Canonical external actor id

All authenticated API actors use `users.id`.

The JWT payload and `req.user.id` represent `users.id` for both clients and workers.

Therefore these fields also store `users.id`:

- `requests.clientId`;
- `requests.assignedWorkerId`;
- `requests.completedByWorkerId`;
- `request_applications.workerUserId`;
- `request_images.uploaderUserId`;
- `reviews.clientUserId`;
- `reviews.workerUserId`;
- `notifications.userId`;
- `worker.userId`.

### Worker profile id

`worker.id` is an internal worker-profile row id. It must not be used as the authenticated actor id or exposed as the worker id in request/application/review contracts.

Public worker endpoints should use a clearly named `userId` until a future opaque public id is introduced.

### Required invariant

One `users` row with role `worker` may have at most one `worker` profile row. `worker.userId` is unique and must eventually have an explicit foreign key to `users.id`.

## Repair Categories

The canonical category identifier is `categoryKey`.

Valid keys:

- `vik`;
- `electro`;
- `painting`;
- `plaster`;
- `tiles`;
- `bathroom_renovation`;
- `drywall`;
- `flooring`;
- `heating_cooling`;
- `windows_doors`;
- `furniture_mounting`;
- `roof_waterproofing`;
- `demolition_cleanup`;
- `full_renovation`;
- `small_repairs`.

Bulgarian category labels are presentation data. They must not be used for joins, authorization, pricing lookup, filters, or state decisions.

During Sprint 1:

- API accepts a valid `categoryKey`;
- backend derives the current display label;
- legacy `requests.category` remains compatibility display data;
- new logic must use `categoryKey`.

## Request State Machine

### Target machine states

- `new`;
- `applied`;
- `assigned`;
- `in_progress`;
- `completed`;
- `canceled`.

Production currently stores legacy Bulgarian display values. Sprint 1 does not perform the destructive status migration, but new decisions must follow the target state machine below.

### Allowed transitions

```text
new -> applied
new -> canceled

applied -> applied
applied -> assigned
applied -> canceled

assigned -> in_progress
assigned -> applied       (unassign)
assigned -> canceled

in_progress -> completed
in_progress -> applied    (explicit unassign/reopen policy only)
in_progress -> canceled   (explicit cancellation policy only)

completed -> terminal
canceled -> terminal
```

Current code combines assignment and start into the legacy `in progress` state. Until the schema migration introduces separate machine states, `assigned` and `in_progress` are represented by the current assigned worker plus legacy in-progress status.

### Transition authorization

| Operation | Allowed actor | Required ownership/invariant |
| --- | --- | --- |
| Create | Client | JWT client id becomes `clientId` |
| List client requests | Client | Only own `clientId` rows |
| List worker feed/map | Worker | Server-side visibility rules |
| Apply | Worker | Request open and unassigned |
| Assign | Client | Client owns request; worker applied |
| Unassign | Client | Client owns request; request not completed |
| Complete | Worker | Worker is the assigned worker |
| Review | Client | Client owns completed request; one review |

Controllers enforce role. Services enforce resource ownership and transition invariants. Neither layer alone is sufficient.

## Request Applications

Target source of truth: `request_applications`.

Unique invariant:

```text
(requestId, workerUserId) is unique
```

Application statuses:

- `applied`;
- `assigned`;
- `withdrawn`;
- `rejected`.

Calling apply more than once for the same request/worker is idempotent. It must not create duplicate rows or duplicate legacy array values.

`requests.appliedWorkers` is compatibility-only. During transition:

- service may dual-write it;
- reads must prefer normalized applications when the feature is migrated;
- no new feature may depend exclusively on the legacy array;
- removal requires a backfill verification and a later migration.

## Request Media

Target source of truth: `request_images` plus persistent file/object storage.

Kinds:

- `before`: client problem/site evidence;
- `after`: assigned worker completion evidence;
- `general`: explicitly categorized non-before/non-after request media.

Required ownership:

- every row belongs to one request;
- `uploaderUserId` is the authenticated `users.id`;
- client may upload before images only to own request;
- assigned worker may upload after images only to assigned request;
- publication requires the applicable approval/moderation rule.

`requests.photos`, `beforePhotos`, and `afterPhotos` are compatibility-only. Base64/data URLs are acceptable for local mock fixtures, not as the production storage design.

## Estimate Contract

Current production compatibility fields:

- `estimateMin`;
- `estimateMax`;
- `estimateCurrency`.

These are display-level summary fields, not a complete audit record.

The future source of truth must be an immutable calculation snapshot containing:

- calculator/pricing/material-index versions;
- category and activity keys;
- quantities and units;
- labor-only or labor-plus-materials mode;
- modifiers and warnings;
- labor/material/expected/possible ranges;
- currency and calculation timestamp.

Old snapshots must never be recalculated from the newest pricing configuration.

## Address and Map Contract

- `address` stores client-entered display text.
- `latitude` and `longitude` store coordinates when available.
- `locationSource` records provenance such as `gps`, `geocoded`, `manual`, or `seed`.
- Exact address visibility is an authorization/privacy decision and must not be inferred only from having coordinates.
- Client accounts do not receive the worker request map.

## Compatibility Exit Criteria

Legacy request fields may be removed only after all conditions are met:

1. Production data is backed up.
2. Backfill into normalized tables is complete.
3. Row-count and orphan checks pass.
4. All reads use normalized tables.
5. Dual-write is disabled.
6. Lifecycle integration and migration tests pass.
7. Rollback procedure is documented and rehearsed.

## Sprint 1 Non-Negotiable Invariants

- IDs are never guessed between worker profile id and user id.
- A client cannot mutate another client's request.
- A worker cannot complete another worker's job.
- A worker cannot be assigned without an application.
- Duplicate apply is idempotent.
- Completed and canceled requests cannot accept new applications.
- A review is accepted only once, by the owning client, after completion.
- New request logic uses stable category keys.
- Production media is not designed around localStorage or data URLs.

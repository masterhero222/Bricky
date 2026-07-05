# Canonical Media Model Proposal

Status: design proposal only; no production migration is included in the Sprint 2 moderation rollout.

## Current State

Bricky currently stores media through three different models:

1. `request_images` contains request ownership, uploader, before/after kind, file metadata, ordering, and moderation.
2. `worker_gallery_images` contains worker ownership, URL, and moderation, but lacks file metadata and stable request/job association.
3. Worker avatars are stored as `workers.avatarUrl` plus separate avatar moderation fields on `workers`.

This creates duplicated moderation code, inconsistent deletion behavior, difficult orphan-file cleanup, and three admin API paths for one conceptual resource.

## Target Model

### `media_assets`

| Column | Purpose |
| --- | --- |
| `id` | Stable asset identifier |
| `ownerUserId` | User who owns the asset |
| `uploadedByUserId` | User who uploaded it |
| `storageProvider` | `local`, later `s3` or another provider |
| `storageKey` | Provider-relative immutable key |
| `publicUrl` | Optional generated/cached public URL |
| `originalName` | Original client filename |
| `mimeType` | Validated media MIME type |
| `sizeBytes` | File size |
| `width`, `height` | Optional image dimensions |
| `checksum` | Optional duplicate/integrity detection |
| `moderationStatus` | `pending_review`, `approved`, `rejected`, `hidden` |
| `moderationReason` | Human-readable reason |
| `moderatedByUserId`, `moderatedAt` | Moderation actor/time |
| `createdAt`, `updatedAt`, `deletedAt` | Lifecycle timestamps |

### `media_links`

| Column | Purpose |
| --- | --- |
| `id` | Link identifier |
| `mediaAssetId` | FK to `media_assets.id` |
| `entityType` | Controlled value: `request`, `worker_profile`, `worker_job` |
| `entityId` | ID in the selected entity type |
| `purpose` | `request_general`, `before`, `after`, `gallery`, `avatar` |
| `sortOrder` | Stable display order |
| `createdAt` | Link timestamp |

Use a uniqueness constraint that prevents duplicate links for the same asset/entity/purpose. Validate `entityType` and `purpose` in application code and DB checks where MySQL support permits it.

## Ownership And Visibility Rules

- The file asset has one owner and one uploader; links never change ownership.
- Public reads require both an approved parent entity and an approved media asset.
- Owners and admins can read pending/rejected assets linked to their own content.
- Deleting a link does not delete the physical asset while another link exists.
- Physical deletion happens only after the final link is removed and the deletion retention period expires.
- Avatar replacement creates a new asset/link and retires the previous link; it does not overwrite storage in place.
- Completed-job portfolio albums link approved before/after request assets instead of copying files.

## Additive Migration Sequence

1. Create `media_assets` and `media_links` with indexes and foreign keys to `users` and `media_assets`.
2. Deploy code capable of reading legacy and canonical rows, preferring canonical rows when present.
3. Enable transactional dual-write for new request images, gallery uploads, and avatars.
4. Backfill `request_images`, then `worker_gallery_images`, then worker avatars in resumable ID batches.
5. Verify row counts, storage keys, moderation states, owner IDs, and sampled file responses.
6. Switch reads to canonical tables while retaining legacy fallback behind a feature flag.
7. Stop legacy writes after a monitored staging period.
8. Remove legacy columns/tables only in a later migration and only after rollback is no longer required.

## Backfill Mapping

- `request_images.requestId` -> link `entityType=request`, `entityId=requestId`.
- `request_images.kind` -> `general/request_general`, `before`, or `after`.
- Request client/assigned worker determines ownership according to uploader and image kind; unresolved rows go to a quarantine report instead of guessed ownership.
- `worker_gallery_images.userId` -> asset owner and link to the worker profile/job.
- `workers.avatarUrl` -> purpose `avatar`, linked to `worker_profile`.
- Existing moderation values and timestamps are copied exactly; they are not re-approved automatically during this migration.

## Required Indexes

- `media_assets(ownerUserId, moderationStatus, createdAt)`
- `media_assets(storageKey)` unique
- `media_assets(checksum)` optional
- `media_links(mediaAssetId)`
- `media_links(entityType, entityId, purpose, sortOrder)`
- unique `media_links(mediaAssetId, entityType, entityId, purpose)`

## Rollback

- Before cutover, disable dual-write and return reads to legacy tables.
- Canonical tables can remain unused without affecting the old application.
- Do not drop canonical tables until backfill reports and storage reconciliation are preserved.
- After legacy writes are stopped, rollback requires replaying canonical rows created after cutover into legacy structures; provide and test that replay script before production cutover.

## Verification Gate

- Migration UP can run twice safely on MySQL 8.4.
- Backfill can resume after interruption without duplicates.
- Counts match by source and purpose.
- Every DB storage key resolves to a file or an explicit missing-file report.
- No file is physically removed while referenced by another link.
- Public APIs never return pending/rejected media.
- Owner APIs retain moderation reasons.
- Admin approve/reject/hide and audit behavior works through one canonical media endpoint.
- Request, map, worker profile, gallery, avatar, and completed-job E2E tests pass before removing legacy fallback.


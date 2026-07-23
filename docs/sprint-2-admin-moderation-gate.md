# Sprint 2 Admin Panel And Moderation Gate

## Purpose

User-generated requests and media no longer become public immediately. Lifecycle status (`status`) and publication moderation (`moderationStatus`) are separate concerns.

## Moderation states

- `pending_review`: visible to the owner and admins; hidden from worker/public feeds.
- `approved`: visible to the intended worker/public surfaces.
- `rejected`: retained for the owner and admins with a reason; not public.
- `hidden`: removed from public visibility without deleting the record.

Existing production rows are backfilled to `approved` once during migration so the deployment does not unexpectedly hide the current site. New rows default to `pending_review`.

## Backend

- `GET /api/admin/dashboard`
- `GET /api/admin/requests?status=pending_review`
- `GET /api/admin/requests/:id`
- `PUT /api/admin/requests/:id` (controlled correction of category, description, or address)
- `DELETE /api/admin/requests/:id` (spam removal with mandatory operational reason)
- `POST /api/admin/requests/:id/approved|rejected|hidden`
- `GET /api/admin/media?status=pending_review`
- `POST /api/admin/media/:id/approved|rejected|hidden`
- `GET /api/admin/workers?status=pending_review`
- `POST /api/admin/workers/:id/profile/approved|rejected|hidden`
- `POST /api/admin/workers/:id/avatar/approved|rejected|hidden`
- `GET /api/admin/reviews?status=pending_review`
- `POST /api/admin/reviews/:id/approved|rejected|hidden`
- `GET /api/admin/users`
- `POST /api/admin/users/:id/suspend|activate`
- `GET /api/admin/audit-logs`

Every endpoint requires a valid JWT and `users.role = admin`. Public registration cannot create an admin. Every mutation stores actor, target, action, reason, timestamp, previous value, new value, and request IP in `admin_audit_logs`.

Worker request feeds and the request map return only approved requests. Request images shown to workers return only approved media. Owners retain access to their pending/rejected request content. Public worker profiles, avatars, gallery, completed-job media, and reviews require approval; owners retain all moderation states in their own profile surfaces. Suspended accounts cannot create a new login session and already-issued JWTs are rejected on their next protected request. The database role is authoritative over a stale JWT role. Admin user responses never include password hashes.

## Frontend

`/admin` provides request, media, worker profile, review, account, and audit workspaces, pending and operational counters, previews, status filters, text search, pagination, detail drawer, recent audit actions, approve, reject, and hide actions. Reject/hide and account status changes use an in-page modal with a required reason. Request details load through a protected endpoint, include linked photos, and expose controlled correction and spam deletion. The route and navigation entry are restricted to the admin role.

When content is rejected or hidden, its owner can still see the moderation reason. A client can correct a rejected/hidden request and resubmit it through `PUT /api/requests/:id/resubmit`; the request then returns to `pending_review` and remains invisible to workers until a new approval.

## Database rollout

Apply in order:

1. `20260705_001_sprint2_foundation_up.sql`
2. `20260705_002_moderation_gate_up.sql`

The second migration is additive and has a matching down migration. Rehearsal runs UP twice to validate idempotency, then DOWN, against MySQL 8.4 in CI.

## Verification

- Backend production build
- Frontend production build
- Backend unit tests cover the admin guard, moderation mutations, audit behavior, and suspended-session rejection.
- MySQL E2E proves pending requests are absent from the worker feed, non-admin access returns 403, rejection exposes a correction reason to the owner, resubmission returns to review, approval makes request/media visible, admin edit/delete are audited, and the normal lifecycle continues afterward.
- Manual frontend smoke in the local mock environment covered admin login, all moderation queues, search/status controls, request details, and removal of approved media from the pending queue without browser-console errors.

## Remaining hardening scope

- Complete the Sprint 2.1 enforcement release gate documented in `docs/sprint-2-1-enforcement-layer.md` before production deployment.
- Add optional reason presets for faster moderation; free-text reasons remain supported.
- Add content scanning hooks before human review; automated decisions must not bypass the audit trail.
- Consolidate request/gallery/avatar rows into one canonical media asset model in a later additive migration.

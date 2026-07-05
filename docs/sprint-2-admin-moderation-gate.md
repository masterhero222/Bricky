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
- `POST /api/admin/requests/:id/approved|rejected|hidden`
- `GET /api/admin/media?status=pending_review`
- `POST /api/admin/media/:id/approved|rejected|hidden`
- `GET /api/admin/audit-logs`

Every endpoint requires a valid JWT and `users.role = admin`. Public registration cannot create an admin. Every mutation stores actor, target, action, reason, and timestamp in `admin_audit_logs`.

Worker request feeds and the request map return only approved requests. Request images shown to workers return only approved media. Owners retain access to their pending/rejected request content. Public worker gallery and history reads return approved media; the worker's own gallery retains all moderation states.

## Frontend

`/admin` provides request and media queues, pending counters, previews, approve, reject, and hide actions. Reject/hide require a reason. The route and navigation entry are restricted to the admin role.

## Database rollout

Apply in order:

1. `20260705_001_sprint2_foundation_up.sql`
2. `20260705_002_moderation_gate_up.sql`

The second migration is additive and has a matching down migration. Rehearsal runs UP twice to validate idempotency, then DOWN, against MySQL 8.4 in CI.

## Verification

- Backend production build
- Frontend production build
- 37 backend unit tests, including admin guard, moderation mutation, and audit behavior
- MySQL E2E updated to prove pending requests are absent from the worker feed, non-admin access returns 403, approval makes the request/media visible, and lifecycle continues afterward

## Remaining moderation scope

- Extend the admin media queue actions from request images to worker gallery/avatar/portfolio records through one canonical media asset model.
- Add worker profile and review queue actions.
- Add pagination, search, reason presets, and richer audit metadata.
- Add content scanning hooks before human review; automated decisions must not bypass the audit trail.


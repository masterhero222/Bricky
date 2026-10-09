# Sprint 3 V2 Data Core Handoff

## Implemented

- Added v2 identity/profile tables through TypeORM entities:
  - `client_profiles`
  - `worker_profiles`
  - `worker_skills`
- Added v2 request lifecycle entities:
  - `repair_requests`
  - `request_applications`
  - `request_events`
  - `request_pricing_snapshots`
- Added canonical media system:
  - `media_assets`
  - worker avatar uploads now use `backend/uploads/users/{userId}/avatar/`
  - worker gallery uploads now use `backend/uploads/workers/{workerUserId}/gallery/`
  - base64/data URLs are rejected from new media assets.
- Added catalog/pricing entities:
  - `repair_categories`
  - `repair_activities`
  - `pricing_rules`
- Added backoffice/billing entities and services:
  - `admin_audit_logs`
  - `worker_plans`
  - `worker_credit_wallets`
  - `worker_credit_transactions`
- Updated registration:
  - client registration creates `users + client_profiles`
  - worker registration creates `users + worker_profiles + worker_skills`
- Updated request flow:
  - `POST /requests` writes to `repair_requests`
  - apply/assign/unassign/complete use v2 lifecycle state and `request_applications`
  - request media writes to `media_assets`
  - admin status changes write request events.
- Updated reviews:
  - reviews validate against `repair_requests.status = completed`
  - canonical worker identifier is `assigned_worker_user_id`.
- Added admin API foundation:
  - `/admin/users`
  - `/admin/workers`
  - `/admin/requests`
  - `/admin/media`
  - `/admin/audit`
  - credit and plan admin actions for `super_admin`.
- Added frontend admin MVP at `/admin`.
- Added referral system v1 foundation:
  - `referrals`
  - `referral_qualifications`
  - `referral_rewards`
  - worker-to-worker and client-to-client code generation
  - registration attribution through `referralCode`
  - backend qualification after canonical request completion plus client review confirmation
  - idempotent 30-day `top_placement_30_days` reward issuance/extension
  - active referral boost metadata on worker profiles
  - admin referral list/detail/reject/revoke/restore endpoints
  - worker dashboard referral section
  - registration support for `?ref=CODE`
- Added SQL migration file:
  - `backend/migrations/20260718_sprint3_v2_data_core.sql`

## Verification

- `cd backend && npm run build` passed.
- `cd backend && npm test -- --runInBand` passed.
- `cd frontend && npm run build` passed.
- After referral implementation:
  - `cd backend && npm run build` passed.
  - `cd backend && npm test -- --runInBand` passed.
  - `cd frontend && npm run build` passed.

## Important Notes

- Legacy tables are not dropped and should be treated as archive/read-only.
- The backend still returns compatibility JSON for existing frontend screens.
- Do not run destructive production cleanup. First take a fresh DB/files backup and rehearse this migration on a restored DB.
- The SQL migration is intended as the production-safe path. Do not rely on `TYPEORM_SYNCHRONIZE=true` for production.
- Referral qualification is triggered by backend review creation after canonical request completion, not frontend state.
- Referral rewards affect ranking only as metadata/input; they do not override approval, suspension or visibility rules.

## Remaining Work

- Run the migration on a fresh local MySQL database and a restored production backup.
- Add real service-level tests for:
  - client/worker registration
  - request create/apply/assign/complete
  - review-once rule
  - media base64 rejection
  - admin audit logging
- Add referral-specific tests:
  - referral code uniqueness
  - invalid/self-referral rejection
  - one referred user cannot have two referrers
  - one request cannot qualify twice
  - two requests from same client do not issue reward
  - two valid requests from different clients issue one reward
  - retrying completion does not issue duplicate reward
  - reward revoke/restore audit behavior
- Expand `/admin` UI into separate screens for category/pricing management and detailed request timeline.
- Expand `/admin` UI referral detail view to show qualification evidence and client/request context.
- Decide whether selected legacy data should be imported into v2 after closed beta validation.

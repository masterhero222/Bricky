# Bricky Request System Recovery Audit

Date: 2026-07-18
Branch: `codex/sprint-3-integration`
Current HEAD at audit start: `be33f0d fix: store worker skills as catalog keys`
Recovery input: `C:\Users\asus\Downloads\request-system-recovery-plan-2026-07-18.md`
QA recording: `20260718-0900-49.4735629.mp4`

## Summary

The request system should enter recovery mode before any more referrals, payments, credits, subscriptions or extra lifecycle states are added.

The current branch contains useful Sprint 3 infrastructure, but the request orchestration is again too broad and split between backend service methods, admin actions, mock localStorage logic and role-specific React pages. The recovery direction should be to preserve the new infrastructure while restoring one backend-authoritative request lifecycle and one canonical applications model.

## Last Reliable Request Implementations

### Last simple MVP core

Candidate commit:

```text
b136ad1 Stable MVP: requests lifecycle, reviews, worker rating, client UI
```

Why it matters:

- simple `requests` table lifecycle;
- direct client request creation;
- worker apply through `appliedWorkers`;
- client assignment through `assignedWorkerId`;
- worker completion to `завършена`;
- client review eligibility was straightforward.

Why it should not be restored wholesale:

- it uses legacy Bulgarian status strings as state;
- it stores applications in `requests.appliedWorkers`;
- it uses ambiguous worker identity (`worker.id` / `worker.userId`);
- it predates useful Sprint 2/Sprint 3 moderation, media, admin audit and v2 profile work.

### Last useful lifecycle-service attempt

Candidate commit:

```text
4a3cdc8 stabilize sprint 2 lifecycle and media
```

Important files from that commit:

```text
backend/src/requests/request-lifecycle.ts
backend/src/requests/request-lifecycle.service.ts
backend/src/requests/requests.service.ts
backend/src/requests/requests.controller.ts
backend/src/requests/entities/request-application.entity.ts
```

Why it matters:

- introduced a dedicated `RequestLifecycleService`;
- used machine-readable states such as `approved`, `assigned`, `worker_arrived`, `in_progress`, `waiting_client_confirmation`, `completed`, `disputed`;
- had explicit endpoints for `arrive`, `start`, `ready`, `confirm`, `dispute`, `resubmit`;
- separated canonical transition logic from UI labels better than the current expanded Sprint 3 state list.

Why it should not be copied wholesale:

- it targeted the legacy `requests` table, not the newer `repair_requests` v2 table;
- it still had compatibility with legacy JSON media and `appliedWorkers`;
- it included `client_confirmed` as a separate state, which the recovery plan now recommends collapsing into direct `completed`.

## Current Useful Work To Keep

Current branch commits worth preserving:

```text
6abc2e6 feat: add sprint 3 data core and referrals
25eaaf3 feat: consolidate dev mock flows
3683dd3 fix: enforce worker approval in request flow
d02cf96 fix: implement request approval lifecycle
1a295d7 fix: moderate request photos during approval
be33f0d fix: store worker skills as catalog keys
```

Keep:

- v2 identity tables: `users`, `client_profiles`, `worker_profiles`, `worker_skills`;
- canonical worker public ID direction: `users.id` as `workerUserId`;
- `repair_requests`;
- `request_applications`;
- `request_events`;
- `request_pricing_snapshots`;
- `media_assets`;
- admin audit logs and admin backoffice shell;
- worker approval/suspension guard;
- request wizard/calculator UX;
- request media moderation concept;
- mock Dev Test tooling as a local-only helper.

Freeze for now:

- referral reward activation logic;
- credits/plans;
- paid placement;
- subscriptions;
- additional lifecycle states.

## Current Root Causes Confirmed

### 1. Too many request status values

Current v2 `RepairRequestStatus` contains:

```text
draft
pending_admin
published
applied
assigned
worker_selected
worker_confirmed
worker_on_site
inspected
in_progress
work_finished
ready_for_client_confirmation
client_confirmed
reviewed
completed
canceled
archived
```

This is more detailed than the recovery target and exposes intermediate states that should either be timestamps/evidence fields or UI labels derived from a smaller state machine.

Recovery target should normalize toward:

```text
pending_review
approved
assigned
worker_arrived
in_progress
waiting_client_confirmation
completed
rejected
disputed
canceled
hidden
```

### 2. Lifecycle logic is not centralized

Current transition rules are spread across:

```text
backend/src/requests/requests.service.ts
backend/src/requests/requests.controller.ts
backend/src/admin/admin.service.ts
frontend/src/pages/ClientProfile.jsx
frontend/src/pages/workers/WorkerProfile.jsx
frontend/src/services/devMockApi.js
```

The previous `4a3cdc8` lifecycle service is the best local source to port deliberately into the v2 request system.

### 3. Application model is only partially canonical

Current backend uses `request_applications`, which is correct. However:

- DTOs still expose `appliedWorkers`;
- mock logic still mutates `appliedWorkers`;
- client/worker UI still uses array-derived state;
- assignment currently marks one application `assigned`, but other applications are not consistently rejected or made historical.

Recovery should make `request_applications` the only mutable source. `appliedWorkers` should remain output compatibility only until UI is ported.

### 4. Client confirmation currently does not complete the request

Current flow includes:

```text
ready_for_client_confirmation -> client_confirmed -> reviewed -> completed
```

The recovery plan requires:

```text
waiting_client_confirmation -> completed
```

Client confirmation should set completion timestamps and complete the job. Review should be an outcome after completion, not another request lifecycle state.

### 5. Media moderation is useful but can become a shadow lifecycle

Current work improved this:

- request-created images are `pending`;
- admin publish approves request images;
- admin archive rejects request images.

Remaining problem:

- request visibility and media moderation should be enforced through one high-level approval action;
- request cards should not rely on separate media and status queues creating partial states.

### 6. Mock is still an independent implementation

Current `frontend/src/services/devMockApi.js` has its own state transition graph. It is useful for development, but it must be made contract-compatible with backend action names, statuses and DTO shape.

## Current Contract Snapshot

### Current backend endpoints

```text
POST /requests
GET /requests/client
GET /requests/worker
GET /requests/worker/completed
GET /requests/map
POST /requests/:id/apply
POST /requests/:id/assign
POST /requests/:id/unassign
POST /requests/:id/worker-confirm
POST /requests/:id/on-site
POST /requests/:id/inspect
POST /requests/:id/start
POST /requests/:id/finish
POST /requests/:id/ready
POST /requests/:id/client-confirm
POST /requests/:id/complete
POST /reviews
POST /admin/requests/:id/status
```

### Desired endpoint direction

Keep compatibility endpoints temporarily, but route all lifecycle changes through one service:

```text
POST /requests/:id/applications
POST /requests/:id/assign
POST /requests/:id/lifecycle/arrive
POST /requests/:id/lifecycle/start
POST /requests/:id/lifecycle/ready
POST /requests/:id/lifecycle/confirm
POST /requests/:id/lifecycle/dispute
POST /admin/requests/:id/approve
POST /admin/requests/:id/reject
POST /admin/requests/:id/recover
```

Compatibility endpoints can call the same lifecycle service, but should not contain their own transition rules.

## Files To Change First

Phase 1 implementation files:

```text
backend/src/requests/request-lifecycle.ts
backend/src/requests/request-lifecycle.service.ts
backend/src/requests/requests.module.ts
backend/src/requests/requests.service.ts
backend/src/requests/requests.controller.ts
backend/src/requests/entities/repair-request.entity.ts
backend/src/requests/entities/request-application.entity.ts
backend/src/reviews/reviews.service.ts
backend/src/admin/admin.service.ts
frontend/src/services/devMockApi.js
frontend/src/pages/ClientProfile.jsx
frontend/src/pages/workers/WorkerProfile.jsx
frontend/src/pages/AdminBackoffice.jsx
```

Add tests alongside:

```text
backend/src/requests/request-lifecycle.service.spec.ts
backend/src/requests/requests.service.spec.ts
```

## Proposed Small Implementation Phases

### Phase A - Add v2 lifecycle service without replacing controllers

- Add `request-lifecycle.ts` with target states and legacy compatibility mapping.
- Add `RequestLifecycleService` for allowed transitions and actor/action validation.
- Keep existing enum values initially, but normalize them internally.
- Add tests for all allowed and invalid transitions.

### Phase B - Route existing methods through lifecycle service

- `workerConfirm`, `markWorkerOnSite`, `markInspected`, `startWork`, `finishWork`, `readyForClientConfirmation`, `clientConfirmWork`, `completeRequest` should stop owning transition rules directly.
- Collapse redundant user-facing steps:
  - `inspect` can become evidence/timestamp later, not core state;
  - `client-confirm` should move the request to `completed`;
  - `complete` after client confirm should become no-op compatibility or be removed from UI.

### Phase C - Make applications canonical

- Assignment transaction rejects or deactivates non-selected applications.
- DTO candidate lists come from `request_applications`, not `appliedWorkers`.
- Mock mirrors the same behavior.

### Phase D - Unify DTO shape

Return at minimum:

```json
{
  "id": 123,
  "statusKey": "assigned",
  "statusLabel": "Избран майстор",
  "nextActor": "worker",
  "allowedActions": ["mark_arrived"],
  "assignedWorkerUserId": 45,
  "applications": [],
  "images": [],
  "lifecycleTimestamps": {}
}
```

### Phase E - Simplify UI actions

- Client, worker and admin pages render one primary action based on backend `allowedActions`.
- Remove stale candidate controls after assignment.
- Remove extra worker "close" requirement after client confirmation.

## Migration Impact

Do not remove current statuses in the next migration.

First migration should be additive:

- add canonical timestamp columns if missing:
  - `worker_arrived_at`;
  - `work_started_at`;
  - `work_ready_at`;
  - `client_confirmed_at`;
  - `disputed_at`;
  - `dispute_reason`;
  - `rejection_reason`;
- add/extend statuses only if needed;
- backfill current values to target values with an explicit mapping script after backup.

Current value mapping proposal:

```text
pending_admin -> pending_review
published -> approved
applied -> approved
worker_selected -> assigned
assigned -> assigned
worker_confirmed -> assigned
worker_on_site -> worker_arrived
inspected -> worker_arrived
in_progress -> in_progress
work_finished -> waiting_client_confirmation
ready_for_client_confirmation -> waiting_client_confirmation
client_confirmed -> completed
reviewed -> completed
completed -> completed
canceled -> canceled
archived -> hidden
```

## Immediate Next Step

Implement Phase A only:

- add v2 lifecycle service files;
- wire into `RequestsModule`;
- add lifecycle unit tests;
- do not yet rewrite UI;
- do not deploy until tests pass.

This gives a stable technical center before any further request flow edits.

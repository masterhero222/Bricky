# Sprint 2.1 Admin Enforcement Layer

Updated: 2026-07-06
Branch: `codex/sprint-2-foundation`

## Purpose

Sprint 2.1 turns moderation and account status into backend-enforced platform rules. Admin actions are no longer treated as display-only flags. The backend remains authoritative even when a caller uses an already-issued JWT or sends requests without the frontend.

## Account enforcement

`JwtAuthGuard` reloads the current user from the database on every protected request. A suspended account is rejected before controller business logic executes. This invalidates existing JWT sessions for protected operations without deleting historical data.

Suspended workers cannot apply, accept assignments, complete requests, upload request or gallery images, upload avatars, edit profiles, or delete gallery images. Suspended workers are excluded from public worker lists, public profiles, batch lookup/recommendation results, and public reviews.

Suspended clients cannot create or resubmit requests, upload request images, assign workers, or submit reviews. Existing content remains stored and available to administrators.

Admin reactivation changes the account back to `active`. Existing JWTs become usable again because the database status, not a stale token claim, is authoritative.

## Request publication enforcement

Only requests with `moderationStatus = approved` may enter worker-facing business flows. Requests in `pending_review`, `rejected`, or `hidden` are excluded from worker feeds and the repair map. They cannot receive applications, assignments, after-photos, completion, or reviews.

Owners and administrators retain the visibility needed for correction and moderation. A rejected or hidden request may be corrected and resubmitted, returning it to `pending_review`; approval is still required before it becomes public.

## Request state enforcement

The request service validates transitions before mutations:

1. `pending_review` content is private.
2. Admin approval makes an unassigned request eligible for applications and assignment.
3. Assignment requires an active, approved worker and an approved, open request.
4. Completion requires the active assigned worker and an approved, open request.
5. Completed or canceled requests cannot be reassigned or returned to an active state through normal request endpoints.

Rejected and hidden requests cannot jump to assignment or completion.

## Review enforcement

A review is accepted only when all of the following are true:

- the authenticated client is active and owns the request;
- the request is approved and completed;
- the assigned worker account is active;
- no review already exists for the same request.

Public review reads for suspended workers are blocked.

## Public worker enforcement

Public worker list, profile, bulk lookup, and recommendation-oriented service methods require both:

- an active `users` account with role `worker`;
- an approved worker profile.

This prevents a suspended worker from remaining visible through an alternate public endpoint after disappearing from the main grid.

## Verification

Local verification on 2026-07-06:

- backend production build: passed;
- backend unit tests: 53 passed across 12 suites;
- unit coverage includes request moderation boundaries, worker suspension, public worker filtering, review prerequisites, and suspended review targets.

Mock-environment hardening on 2026-07-06:

- the mock worker feed and map now expose only approved, open requests;
- rejected, hidden, and pending requests cannot receive mock applications, assignment, completion, or reviews;
- mock account suspension blocks existing sessions and direct profile/gallery/avatar helpers;
- public mock worker pages exclude suspended or unapproved workers;
- request, gallery, and avatar media share the mock admin moderation queue;
- new mock requests, uploads, profile changes, and reviews enter `pending_review`;
- `npm run test:mock-moderation` proves pending/rejected publication boundaries plus suspend/reactivate behavior;
- the flow was manually reproduced against the local mock UI at `http://127.0.0.1:5175`.

The MySQL lifecycle E2E suite now covers:

- existing JWT rejection after worker suspension;
- blocked apply, assignment, completion, profile edit, avatar upload, gallery upload, gallery delete, and request after-photo upload;
- suspended worker removal from public list/profile;
- reactivation restoring normal worker operations;
- suspended client request creation rejection and reactivation recovery;
- hidden request removal from the map and assignment rejection;
- review rejection while the assigned worker is suspended.

The expanded MySQL E2E suite passed in GitHub Actions run `28759468108` for commit `3c1f6bf`.

## Production gate

Sprint 2 moderation is production-ready only after:

1. staging receives the migrations and the release-candidate build;
2. the enforcement acceptance cases are smoke-tested through both UI and direct API calls;
3. production backup and rollback prerequisites in `docs/sprint-2-staging-deployment-checklist.md` are satisfied.

# Bricky Version Inventory And Release Rules

Date: 2026-07-18

## Decision

`C:\projects\Bricky Live` is the canonical working repo.

All other local folders, Git worktrees, old server copies, and backup folders are donors or archives. Do not develop directly in them unless we intentionally create a new Git worktree for a specific branch.

## Why This Exists

Bricky currently has multiple versions with different strengths:

- one version has referral work but incomplete UI integration;
- one version has stronger premium UI but can miss newer backend/data work;
- one version has admin/backoffice work but is not fully polished visually;
- live/server snapshots may show what used to work, but they are not automatically the best source for future changes.

The fix is not choosing whole folders by feeling. The fix is choosing one canonical repo and merging features one by one with verification.

## Current Local Sources

| Source | Path / Branch | Role | Notes |
| --- | --- | --- | --- |
| Canonical working repo | `C:\projects\Bricky Live` / `codex/sprint-3-integration` | Source of truth | Current integration target. Contains recent Sprint 3 v2 DB/admin/referral work as uncommitted changes. |
| Premium UI worktree | `C:\projects\Bricky Live\.worktrees\live-premium-ui` / `codex/live-premium-ui` | UI donor | Premium UI branch. Use as visual reference/donor only. |
| Server premium UI worktree | `C:\projects\Bricky Live\.worktrees\server-premium-ui` / `codex/server-premium-ui` | UI/server donor | Similar premium UI layer from server-oriented branch. Use only for diff/reference. |
| Production request v2 worktree | `C:\projects\Bricky Live\.worktrees\production-request-v2` / currently `codex/sprint-2-release-report` | Release/auth donor | Stronger Sprint 2/auth/email/release evidence area. Do not treat as the current app automatically. |
| Live server sync branch | `live-sync-2026-06-19` | Production snapshot/reference | Server sync snapshot. Useful for checking what was live, not for direct feature development. |
| Old local repo | `C:\projects\Bricky\Bricky` / `bricky-web-test` | Archive/donor only | Older November 2025 style repo. Clean, but not current source of truth. |
| DB backups | `C:\projects\db_backup` | Data archive | Never edit as app source. Use only for DB restore/rehearsal reference. |

## Current Canonical Feature State

In `C:\projects\Bricky Live`:

- Premium dark UI base was started from `codex/premium-dark-ui`; current active integration branch is `codex/sprint-3-integration`.
- Sprint 3 v2 data core has been added locally:
  - `users` v2 compatibility fields;
  - `client_profiles`;
  - `worker_profiles`;
  - `worker_skills`;
  - `repair_requests`;
  - `request_applications`;
  - `request_events`;
  - `request_pricing_snapshots`;
  - `media_assets`;
  - catalog/pricing tables;
  - admin audit/credits/plans.
- Referral v1 foundation has been added locally:
  - `referrals`;
  - `referral_qualifications`;
  - `referral_rewards`;
  - `referralCode` registration attribution;
  - worker dashboard referral panel;
  - admin referrals tab/endpoints;
  - reward metadata on worker profiles.
- Backoffice MVP exists at `/admin`.
- SQL migration exists at `backend/migrations/20260718_sprint3_v2_data_core.sql`.
- Builds/tests were green after Sprint 3/referral integration:
  - `cd backend && npm run build`;
  - `cd backend && npm test -- --runInBand`;
  - `cd frontend && npm run build`.

## What Mock Means

Mock is not another Bricky version.

Mock is a local frontend simulation used to click UI without relying on the real backend/database.

Use mock for:

- visual UI testing;
- quick role login flows;
- checking that screens and buttons render;
- safe frontend experiments.

Do not use mock as proof for:

- production DB migrations;
- referral qualification correctness;
- real request lifecycle;
- admin audit correctness;
- payment/credits correctness;
- live deploy readiness.

Production truth is:

```text
frontend + backend + MySQL + migrations + real API + production-like smoke test
```

## Release Rules

1. No direct folder copying to live.
2. No production deploy from an uncommitted mystery state.
3. Every live candidate must come from a Git commit SHA.
4. Before deploy:
   - backend build passes;
   - backend tests pass;
   - frontend build passes;
   - DB migration is rehearsed on a restored backup;
   - role flows are manually tested in production-like conditions.
5. Live deploy updates PM2 to the active release path, not just a copied folder.
6. Production cleanup/destructive DB changes require fresh backup plus rehearsal.

## Integration Strategy

We integrate by feature, not by folder.

Order:

1. Stabilize current canonical repo state.
2. Commit a checkpoint branch for Sprint 3 data/referral work.
3. Compare premium UI donor branches against canonical UI.
4. Pull only the missing good UI pieces.
5. Verify calculator separately.
6. Verify admin panel separately.
7. Verify referral separately.
8. Run DB migration rehearsal.
9. Create one release candidate commit.
10. Deploy that exact commit only after smoke tests.

## Immediate Next Steps

1. Create a clean checkpoint commit for the current Sprint 3/referral work.
2. Keep new integration work on `codex/sprint-3-integration`.
3. Run a local app smoke through:
   - worker registration with referral code;
   - client registration with referral code;
   - request create/apply/assign/complete/review;
   - referral progress/reward activation;
   - admin referrals view.
4. Compare calculator behavior against the older good calculator source.
5. Compare public UI against the premium UI donor worktree.
6. Only then prepare production rehearsal.

## Non-Negotiable Source Of Truth

When in doubt:

- code source of truth: `C:\projects\Bricky Live`;
- data identity source of truth: `users.id`;
- DB schema source of truth: v2 tables plus migration SQL;
- deployment source of truth: Git commit SHA;
- live behavior source of truth: production-like smoke test, not mock.

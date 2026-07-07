# Sprint 2 Current-To-Target Migration Mapping

Updated: 2026-07-05

Migration version: `20260705_001_sprint2_foundation`

This phase is additive. It creates canonical structures beside the legacy schema and backfills a machine-readable status. It does not remove or rename production columns and it does not switch backend reads.

## Request Mapping

| Current source | Target | Phase 1 action | Later exit condition |
| --- | --- | --- | --- |
| `requests.clientId` relation | `requests.clientUserId` semantics | Keep physical column; document it as `users.id` | Rename only in a later breaking migration |
| `requests.category` | UI label snapshot | Keep | Stop using for logic before optional removal |
| `requests.categoryKey` | stable category key | Keep and validate | Make non-null after orphan/category report passes |
| localized `requests.status` | `requests.statusKey` | Add/backfill machine key | Switch code, verify, then remove localized enum |
| `requests.appliedWorkers` | `request_applications` | Keep dual-write temporarily | Backfill, compare, switch reads, disable dual-write |
| `assignedWorkerId` | assigned `users.id` | Keep; add canonical index now | Add FK only after orphan cleanup |
| `completedByWorkerId` | completing `users.id` | Keep; add canonical index now | Add FK only after orphan cleanup |
| copied client name/email/phone | user/contact snapshot decision | Keep unchanged | Technical/legal decision before normalization |
| `photos`, `beforePhotos`, `afterPhotos` | normalized media rows/files | Keep compatibility data | Backfill valid files, verify checksums, switch reads |
| `estimateMin/Max/Currency` | display summary | Keep | Populate from immutable accepted snapshot |
| no immutable estimate | `request_calculations` | Create table | Backend writes snapshot transactionally |
| activities embedded in description/snapshot | `request_activities` | Create table | Backend writes stable activity keys |
| no lifecycle audit | `request_events` | Create table | Service writes every state transition |
| no address privacy field | `addressVisibility` | Add default `private` | Enforce API visibility policy |
| incomplete timestamps | assigned/started/canceled/updated timestamps | Add nullable fields | Populate through state transitions/backfill |

## Worker Mapping

| Current source | Target | Phase 1 action | Later exit condition |
| --- | --- | --- | --- |
| `worker.userId` | canonical user FK | Preflight/report only | Add FK after every row resolves and duplicates are zero |
| `worker.id` | internal profile id | Keep | Never use as JWT/API actor id |
| worker email/password/phone | `users` auth and private contact | Keep but freeze new writes | Migrate values, compare, remove duplicates |
| `worker.skills` simple-array | normalized worker skills | Design only in phase 1 | Backfill stable category keys before switch |
| avatar URL | media asset reference | Keep compatibility field | Migrate after media service is approved |

## Application And Media Mapping

| Current source | Target | Phase 1 action | Later exit condition |
| --- | --- | --- | --- |
| `request_applications` raw ids | canonical rows with FKs | Keep current table | Add FKs after orphan report is zero |
| `request_images` URL/longtext | canonical media abstraction | Keep current table | Migrate to storage keys and shared media service |
| worker gallery URL rows | media assets/portfolio | No destructive change | Migrate after request/portfolio ownership is approved |

## Review And Notification Mapping

| Current source | Target | Phase 1 action | Later exit condition |
| --- | --- | --- | --- |
| review raw request/client/worker ids | FK-backed review | Preflight/report only | Add FKs after orphan cleanup |
| accidental review completion fields | completion stays on request | No phase 1 removal | Verify physical schema, then drop in dedicated migration |
| notification message text | stable type + payload | Keep current row | Add payload/audit fields after event contract is implemented |

## Phase 1 Forward Migration

`scripts/migrations/20260705_001_sprint2_foundation_up.sql`:

1. creates a migration ledger;
2. adds `statusKey`, privacy and lifecycle timestamp fields to requests;
3. backfills known localized statuses without changing the legacy status;
4. adds canonical request indexes;
5. creates `request_activities`;
6. creates immutable `request_calculations`;
7. creates append-only `request_events`;
8. records the migration version.

## Rollback

`scripts/migrations/20260705_001_sprint2_foundation_down.sql` removes only the structures introduced by Phase 1. It leaves all legacy tables and values untouched.

Rollback is for rehearsal and emergency use before the backend starts relying on new tables. Once production writes canonical rows, rollback also requires an export/retention decision for those rows.

## Production Gate

Do not apply Phase 1 to production until:

- a fresh `mysqldump` is restored successfully;
- `db-sprint2-preflight.sql` is reviewed;
- migration rehearsal passes on the restored dump;
- all unknown statuses are explicitly mapped;
- rollback passes and preserves legacy row counts;
- application code remains compatible with the additive columns;
- deployment owner gives explicit approval.

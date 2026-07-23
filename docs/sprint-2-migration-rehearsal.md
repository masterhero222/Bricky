# Sprint 2 Migration Rehearsal Evidence

Updated: 2026-07-05

## Result

Migration version:

```text
20260705_001_sprint2_foundation
```

Branch and commit:

```text
codex/sprint-2-foundation
a2b1dea63c24477e6ea9fa31b33d5d15c4187412
```

GitHub Actions:

```text
Workflow: Bricky verification
Run: 28731780770
Status: completed
Conclusion: success
```

Run URL:

```text
https://github.com/masterhero222/Bricky/actions/runs/28731780770
```

## Verified In MySQL 8.4

- clean production-like fixture database created;
- legacy request rows inserted;
- additive UP migration executed;
- three canonical tables created;
- six request columns created;
- Bulgarian legacy statuses mapped to `new` and `in_progress` without changing the legacy status column;
- migration ledger entry created;
- second UP run executed idempotently;
- DOWN migration executed;
- Sprint 2 tables and columns removed;
- original request row count preserved;
- original localized status values preserved after rollback.

## Additional Gate Evidence

The same workflow also passed:

- read-only database preflight safety verification;
- migration static contract verification;
- pricing configuration verification for 97 activities and 174 material items;
- frontend production build;
- backend production build;
- backend Jest: 7 suites, 29 tests.

## Scope Limitation

This proves SQL syntax, idempotency, rollback mechanics, status mapping, and legacy-row preservation against the repository fixture. It does not prove compatibility with every row and schema variation in the real production database.

Before production execution:

1. create and verify a fresh production backup;
2. restore it into an isolated schema/server;
3. run `scripts/db-sprint2-preflight.sql` and archive the output;
4. review unknown statuses, missing users, duplicate profiles/applications, and media orphans;
5. execute the same UP/idempotency/DOWN rehearsal;
6. compare table counts and checksums;
7. obtain explicit deployment approval.

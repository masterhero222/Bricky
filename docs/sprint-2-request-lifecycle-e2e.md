# Sprint 2 Request Lifecycle E2E Evidence

Updated: 2026-07-05

## Result

Branch and commit:

```text
codex/sprint-2-foundation
5039cb2
```

GitHub Actions:

```text
Workflow: Bricky verification
Run: 28731998934
Status: completed
Conclusion: success
```

Run URL:

```text
https://github.com/masterhero222/Bricky/actions/runs/28731998934
```

## Environment

- Ubuntu GitHub-hosted runner;
- Node.js 22;
- MySQL 8.4 service;
- isolated database `bricky_sprint1_e2e`;
- `NODE_ENV=test`;
- TypeORM synchronization enabled only for the isolated test database;
- isolated temporary uploads directory.

## Proven Lifecycle

The existing full Nest E2E suite is now mandatory in CI and proves:

1. client and two workers can register and log in;
2. worker cannot create a client request;
3. client creates a request with stable category key, coordinates, EUR estimate, and ownership;
4. owning client uploads real multipart before images;
5. uploaded files are served with the expected content type;
6. owning client can delete request media and the stored file disappears;
7. role-specific request feed/map access works;
8. worker application is idempotent;
9. owning client assigns an applicant;
10. another worker cannot upload after evidence or complete the request;
11. assigned worker uploads real multipart after evidence and completes the request;
12. duration and completed worker identity are persisted;
13. backend application restart retains media and completed worker history;
14. owning client can review the completed request once;
15. duplicate review is rejected and public rating aggregate is correct.

## Same-Run Database Evidence

The same workflow also runs the Sprint 2 migration rehearsal in a separate MySQL database:

- additive UP migration;
- idempotent second UP;
- rollback DOWN;
- stable status mapping;
- preserved legacy rows.

## Remaining Gaps

This is strong isolated integration evidence, but it does not replace:

- rehearsal against a restored real production dump;
- browser-level responsive E2E;
- map privacy/visibility assertions at HTTP/DB level;
- moderation and rate-limit tests;
- staging deployment and rollback;
- post-deploy production smoke.

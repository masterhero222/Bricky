# Sprint 2 Remaining Issues

Updated: 2026-07-07

| Priority | Issue | Reproduction / Evidence | Next action |
| --- | --- | --- | --- |
| P0 | Current commit has not passed MySQL CI | Local machine has no Docker/MySQL | Push branch and inspect GitHub workflow |
| P0 | VPS staging is not yet deployed | No isolated staging PM2/DB/uploads evidence | Create isolated staging and run three flows |
| P0 | Real phone photo is not attached | Generated 10/15/20 MB fixtures pass, but real EXIF file is pending | Test the user-supplied file through all upload types |
| P0 | Production is not validated on this release | Production remains untouched before staging | Merge via PR only after staging, then run disposable flow |
| P1 | Rollback has not been demonstrated for migration `003` on staging | SQL contract is green; server rehearsal pending | Run reverse DOWN sequence against staging copy |

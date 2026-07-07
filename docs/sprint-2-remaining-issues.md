# Sprint 2 Remaining Issues

Updated: 2026-07-07

| Priority | Issue | Reproduction / Evidence | Next action |
| --- | --- | --- | --- |
| P0 | Real phone photo is not attached | Generated 10/15/20 MB fixtures pass, but real EXIF file is pending | Test the user-supplied file through all upload types |
| P0 | Production is not validated on this release | Production remains untouched before staging | Merge via PR only after staging, then run disposable flow |
| P1 | GitHub CLI is unavailable locally | Branch can be pushed, but the required publish workflow cannot open the PR through `gh` | Install and authenticate GitHub CLI before the release PR |

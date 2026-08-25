# Bricky - Daily Sprint 1 Audit

Date: 2026-08-11

## Executive status

The production backend is healthy and the request lifecycle has strong automated coverage. During this sprint, pricing was unified behind one adapter and one request snapshot contract, and registration/reset now share one strong-password policy.

The frontend builds and lints cleanly. A mobile Lighthouse run against `https://bricky.bg` scored 59 for performance and 100 for accessibility, best practices, and SEO. The main performance delay is the initial document response, not JavaScript execution.

## 1. Systems

### Calculator and pricing

Status: **Implemented and verified locally**

- Admin pricing rules are versioned and auditable.
- Both calculators consume the same `/catalog` adapter.
- A quote uses either complete live rule coverage or the complete static emergency fallback; rules are never mixed inside one estimate.
- The request stores the pricing source, version, canonical activities and displayed ranges in its immutable snapshot.
- Pricing verification now tests behavior, including complete live coverage, exact area and partial-catalog fallback.
- The current live catalog has no active pricing rules, so production remains on the explicit fallback until an administrator activates a complete rule set.

Required action:

1. Create one shared catalog/pricing adapter.
2. Make both calculators consume the same live active pricing version.
3. Keep the static table only as an explicitly marked emergency fallback.
4. Store the exact pricing version and values as an immutable request snapshot.
5. Replace source-text assertions with behavior tests.

### AI pricing

Status: **Suitable for recommendations, not autonomous writes**

AI can analyze completed jobs, accepted offers, category, activity, location, duration and estimate error. It should produce daily recommendations and anomaly alerts. An administrator should approve a recommendation before it creates a new active pricing version. Direct daily AI edits would make pricing difficult to explain, audit and roll back.

### Request lifecycle

Status: **Technically stable; UX validation remains**

- Backend tests pass: 33 suites and 211 tests.
- The complete client -> admin -> worker -> client review -> worker close path is covered.
- Contact details unlock only after worker confirmation.
- User cancellation is blocked after confirmation; admin intervention is supported.
- Completed requests move out of active feeds and into history.
- Suspended workers are covered by authorization tests.

Potential UX friction:

- `worker_confirmed`, `worker_on_site`, `inspected`, `in_progress`, `work_ready`, `client_confirmed`, `reviewed`, `completed` is a long visible sequence.
- Keep the backend evidence states, but present one clear next action at a time.
- Do not remove lifecycle states until real closed-beta sessions show where users abandon the flow.

### Reviews and applications

Status: **Core rules work; usability test required**

- A worker can apply once and withdraw before selection/confirmation.
- A client can select an applicant and remove that selection before worker confirmation.
- A completed request can be reviewed once.
- The worker performs the final close after review.

Required usability check: complete the flow with one new client and one new worker on a phone without developer tools and record time, errors and unclear labels.

### Password security

Status: **Implemented and verified locally**

- Client registration, worker registration and password reset require 6-128 characters, an uppercase letter and a digit.
- Backend validation is authoritative and frontend forms show the same requirement.
- Existing-account login validation remains backward compatible.
- Password policy behavior tests pass for weak and strong examples.

Required policy: minimum 10 characters, at least one lowercase letter, uppercase letter and digit; allow password managers and long passphrases; enforce the same policy in backend registration, reset and frontend feedback.

### Database cleanup

Status: **Operational controls exist; destructive cleanup should be scripted**

- Admin can block users and suspend workers.
- Production records should be soft-disabled, not deleted manually.
- Add a dry-run cleanup command restricted to accounts explicitly tagged as test data.
- The command must print affected users/profiles/requests/media, require a fresh backup, run transactionally and create an audit report.

### Admin panel

Status: **Broad functional surface present; full click-through acceptance pending**

Present modules include users, workers, requests, media moderation, categories, pricing, referrals and audit. Pricing and moderation actions call backend APIs and write reasons/audit data. A role-by-role acceptance run is still required for every button, empty state, error state and refresh.

## 2. Frontend

### Build health

Status: **Pass**

- ESLint passes.
- Production build passes.
- Main bundle: approximately 97 KB gzip.
- Pricing engine chunk: approximately 13 KB gzip.
- Screens are code-split into route chunks.

### Live mobile performance

Lighthouse results:

| Metric | Result |
| --- | ---: |
| Performance | 59 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| First Contentful Paint | 5.2 s |
| Largest Contentful Paint | 6.0 s |
| Total Blocking Time | 20 ms |
| Cumulative Layout Shift | 0 |
| Root document response | 1.98 s |

Interpretation: interaction code is not blocking the browser, but the first server/document response and initial rendering are too slow. Investigate NGINX/Cloudflare caching, compression, cache headers and the initial dependency chain before spending time on decorative animation.

### Navigation and map

Status: **Known regression needs a route-transition test**

The map page renders `WorkerProfileSidebar`. The browser smoke now starts inside the worker panel, clicks Map through client-side navigation, verifies the sidebar immediately and returns to Requests. It must be executed against the release environment with the smoke accounts before deployment acceptance.

### Animations

Status: **Use selectively**

Do not animate every screen. Add consistent 120-200 ms feedback to menus, tabs, dialogs, validation, moderation results and request status transitions. Preserve `prefers-reduced-motion`. Avoid large entrance animations on repeated operational screens.

### Branding overlap

Status: **Needs visual regression coverage**

The internal Bricky wordmark is now hidden in candidate-selection mode, where the global site branding is already visible. Public standalone worker profiles retain their internal profile branding.

## 3. Text and visual language

### Current issues

- Operational screens overuse bold/black weights for headings, labels and actions at the same time.
- Some request steps contain long explanatory paragraphs where a short label and one contextual hint would scan better.
- Cyan, green, red, blue and amber all carry meaning, but a few controls use color decoratively as well, weakening status semantics.
- Muted slate text is sometimes too faint on dark panels even though the sampled Lighthouse page passed automated contrast checks.

### Recommended typography rules

- Page title: `font-bold`, not `font-black`.
- Section title: `font-semibold` or `font-bold`.
- Field label and button: `font-semibold`.
- Body text: normal weight.
- Helper text: normal weight and no smaller than 14 px on forms.
- Reserve red for destructive actions/errors, green for success/primary completion, amber for pending/warning and cyan for neutral product accents.
- Replace paragraphs with progressive disclosure when the information is not needed to complete the current action.

## Priority order

### P0 - Product correctness

1. Unify live pricing for client and worker calculators.
2. Add one pricing snapshot contract and behavior tests.
3. Enforce one strong-password policy everywhere.
4. Run one real end-to-end request lifecycle acceptance session.

### P1 - Navigation and trust

1. Fix and regression-test the map sidebar transition.
2. Remove the duplicated/overlapping Bricky branding in worker preview.
3. Complete admin click-through acceptance, especially pricing and media moderation.
4. Add safe test-account cleanup tooling.

### P2 - Polish and speed

1. Reduce initial server response time and unused initial JavaScript.
2. Standardize typography and status colors.
3. Add restrained interaction animations with reduced-motion support.
4. Run mobile usability sessions for application and review flows.

## Definition of done for Daily Sprint 1

- Both calculators show the same amount for the same active pricing rule.
- Admin price activation is visible in both calculators after refresh.
- Weak passwords are rejected by API and UI.
- One recorded request completes from creation to review and history without manual DB edits.
- Map sidebar works through client-side navigation without refresh.
- Admin pricing, media, worker approval, suspension and request intervention have acceptance evidence.
- Mobile Lighthouse performance improves from 59, with root response and LCP recorded before and after.

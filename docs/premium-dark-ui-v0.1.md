# Bricky Premium Dark UI v0.1

Updated: 2026-06-30

## Branch safety

- Pre-UI mock snapshot: `codex/mock-v0.2-before-premium-ui`
- UI implementation branch: `codex/premium-dark-ui`

The snapshot branch preserves the working mock application before the visual redesign.

## Implemented

- Shared site-wide theme tokens and premium navy background.
- Consistent green primary and blue secondary actions.
- Branded responsive navigation with active route state.
- Dark worker grid with avatars, trust badges, location, skills and profile links.
- Redesigned client request cards with ID badge, status, selected-worker state and icon rows.
- Reusable request photo carousel with horizontal scrolling and overflow arrows.
- Responsive client dashboard navigation.
- Replaced the client profile and settings placeholders with styled presentation sections.
- Compatibility styling for existing auth, worker dashboard, wizard and profile screens.

## Reusable UI

- `frontend/src/styles/theme.css`
- `frontend/src/components/requests/RequestInfoRow.jsx`
- `frontend/src/components/requests/RequestPhotoCarousel.jsx`

## Logic boundaries

This change does not modify:

- database schema or data;
- API contracts;
- authentication;
- request creation or candidate logic;
- pricing rules or calculations;
- mock localStorage schema.

## Verification

- Production frontend build passes.
- Pricing configuration verification passes for 97 activities and 174 material items.
- Focused lint passes for the new shared UI, navbar and worker grid.
- Desktop workers and client requests were visually verified at the local preview.
- Client requests were verified at a 390 x 844 mobile viewport.

## Remaining polish

- Gradually migrate the large worker dashboard to explicit shared card/button components instead of compatibility classes.
- Replace the old worker public profile layout with the same explicit card hierarchy.
- Add a full-screen image viewer to the request carousel if requested; thumbnails currently open the source image in a new tab.

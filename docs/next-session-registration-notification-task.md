# Next Session Task - Registration And Notification System

Status: partially implemented locally / production SMTP smoke still required
Priority: P0 after the current Sprint 2 stabilization gate
Scope: account registration, account recovery, transactional email, and platform-news notification readiness

## Objective

Stabilize the Bricky account registration and notification system so users can safely create accounts, confirm ownership, recover access, and receive platform communication without leaking security information or relying on frontend-only checks.

## Implemented In Current Code

- Client and worker registration creates unverified accounts.
- Login is blocked until email confirmation.
- Real backend confirmation supports both:
  - `/auth/verify-email` with a single-use expiring link token;
  - `/auth/verify-email-code` with account email plus a 6-digit code from the email.
- Verification links and codes are hashed in `account_tokens`.
- Resend verification is generic and rate-limited.
- Password reset uses a single-use expiring token and revokes sessions after password change.
- Account email delivery is logged without storing raw tokens or provider credentials.
- Mock mode does not require SMTP and mirrors the production flow through `mockEmailOutbox`.
- Mock registration, duplicate email rejection, unverified login blocking, verification, password reset, and unsubscribe are covered by `npm run test:mock-auth`.

## Remaining Required Work

### Registration And Account Confirmation

- Smoke test the complete client registration flow against the real production/staging SMTP provider.
- Smoke test the complete worker registration flow against the real production/staging SMTP provider.
- Block protected marketplace actions for unverified accounts in the backend.
- Confirm every protected marketplace action is covered by `VerifiedAccountGuard`.

### Password Reset And Password Change

- Implement and verify password-reset request by email.
- Return generic success for reset requests so account existence is not leaked.
- Send a single-use, expiring, hashed password-reset token.
- Invalidate the reset token after successful use.
- Increment the user token/session version after password change so existing JWT sessions stop working.
- Send a password-changed security notification after successful reset/change.
- Add clear frontend success/error states for reset and change flows.

### Notification And Email System

- Keep transactional/security emails separate from marketing/platform-news emails.
- Add or verify delivery logging for verification, reset, password-changed, and future news emails.
- Do not store raw tokens or full sensitive email bodies in logs.
- Add provider failure states and retry handling.
- Add cleanup for expired/used account tokens and old email delivery logs.
- Configure production SMTP/API provider only through environment variables.
- Never commit real provider credentials.

### Platform-News Notifications

- Keep platform-news emails opt-in only.
- Store consent timestamp and consent source.
- Provide a visible user setting for news opt-in/opt-out.
- Include one-click unsubscribe in future news emails.
- Implement the actual news-campaign sender only after Sprint 2 release gates are closed.

## Acceptance Criteria

- New client account receives and completes email verification.
- New worker account receives and completes email verification.
- Unverified accounts cannot create requests, apply for requests, upload media, assign workers, review, or modify marketplace data.
- Verification resend is rate-limited and does not expose account existence.
- Password reset works exactly once and expires correctly.
- Old sessions stop working after password reset/password change.
- Suspended accounts cannot use verification or reset flows to regain access without admin reactivation.
- News emails are sent only to opted-in users.
- Unsubscribe takes effect immediately.
- No account-existence leak appears through API responses, logs, or frontend messages.
- No raw tokens, SMTP passwords, or API credentials are committed.

## Related Files

- `docs/account-email-notification-audit.md`
- `docs/email-provider-smoke-checklist.md`
- `docs/next-session-todo.md`
- `backend/.env.example`
- `backend/src/auth`
- `backend/src/account-security`
- `backend/src/mail`
- `backend/src/notifications`
- `frontend/src/pages/auth`
- `frontend/src/components/settings`

## Notes For The Next Session

This handoff was originally documentation-only. The current branch now includes application changes for real email verification links/codes and mock parity. It still does not include committed SMTP credentials or production data changes.

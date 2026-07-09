# Bricky Account Email And Notification Audit

Date: 2026-07-09

## Scope

This audit maps the current registration, login, mail, notification, and database state before implementing account email verification, password reset, and platform-news notifications.

No application code, schema, production data, or environment configuration was changed by this audit.

## Current Backend State

### Auth

Relevant files:

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/jwt-auth.guard.ts`
- `backend/src/auth/jwt.strategy.ts`
- `backend/src/auth/dto/register-user.dto.ts`
- `backend/src/auth/dto/login-user.dto.ts`

Current behavior:

- `POST /auth/register` creates either a client or worker account.
- `POST /auth/register-client` and `POST /auth/register-worker` proxy into the same register method.
- Registered accounts are immediately active.
- Login checks email/password and blocks `accountStatus = suspended`.
- JWT payload contains only `id` and `role`.
- `JwtAuthGuard` reloads the user on protected requests and blocks suspended accounts.
- Dev login is disabled in production.

Important gaps:

- No email verification before account use.
- No `emailVerifiedAt` or equivalent verification state.
- No verification token model.
- No password reset endpoints.
- No password reset token model.
- No JWT invalidation version for password changes.
- No rate limiting around registration, login, verification resend, or password reset.
- Login error messages are not fully normalized: missing user and invalid password can produce different Bulgarian messages.

### Users

Relevant files:

- `backend/src/users/user.entity.ts`
- `backend/src/users/users.service.ts`

Current `users` entity fields:

- `id`
- `name`
- `email`
- `password`
- `role`
- `accountStatus`

Important gaps:

- No email verification fields.
- No `tokenVersion` / `sessionVersion`.
- No `passwordChangedAt`.
- No notification preference fields.
- No account-news consent timestamp/source.
- `role` and `accountStatus` are varchar-like values, not strict enums at the entity layer.

### Mail

Relevant files:

- `backend/src/mail/mail.module.ts`
- `backend/src/mail/mail.service.ts`
- `backend/src/mail/mail.config.ts`
- `backend/src/mail/templates/request-confirmation.hbs`

Current behavior:

- `MailModule` uses `@nestjs-modules/mailer`, Nodemailer, and Handlebars templates.
- SMTP-like settings come from `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, and `MAIL_FROM`.
- `MailService` currently sends request confirmation email only.

Important gaps:

- Mail service is not yet structured around account email types.
- No templates for verification, password reset, password changed, account security events, or platform-news emails.
- No email delivery log table.
- No retry/failure state model.
- Existing mail service contains mojibake log/subject strings and should be cleaned while extending it.
- No unsubscribe token or preference center integration.

### In-App Notifications

Relevant files:

- `backend/src/notifications/notification.entity.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/notifications.controller.ts`

Current behavior:

- Notifications are stored in `notifications`.
- Records include `userId`, `type`, `message`, optional `requestId`, `isRead`, and `createdAt`.
- Users can fetch their latest 50 notifications and mark a notification as read.

Important gaps:

- No email delivery is linked to in-app notifications.
- No notification preference model.
- No security/audit distinction between transactional messages and marketing/news.
- No background queue or retry mechanism.

### Database Migrations

Relevant files:

- `scripts/migrations/20260705_001_sprint2_foundation_up.sql`
- `scripts/migrations/20260705_002_moderation_gate_up.sql`
- `scripts/migrations/20260706_003_controlled_request_lifecycle_up.sql`
- matching `_down.sql` scripts
- `scripts/verify-sprint2-migration.mjs`
- `scripts/rehearse-sprint2-migration.sh`

Current state:

- Sprint 2 uses SQL migrations in `scripts/migrations`.
- Production deploy policy requires `TYPEORM_SYNCHRONIZE=false`.
- Future account/email changes should be additive and idempotent, following the Sprint 2 migration pattern.

## Recommended Data Model Additions

Add an additive migration for account/email functionality.

### `users` table additions

Suggested columns:

- `emailVerifiedAt DATETIME NULL`
- `emailVerificationRequired TINYINT(1) NOT NULL DEFAULT 1`
- `tokenVersion INT NOT NULL DEFAULT 0`
- `passwordChangedAt DATETIME NULL`
- `newsOptIn TINYINT(1) NOT NULL DEFAULT 0`
- `newsOptInAt DATETIME NULL`
- `newsOptInSource VARCHAR(100) NULL`
- `newsUnsubscribedAt DATETIME NULL`

Notes:

- Admin accounts can be manually marked verified in production seed/admin maintenance scripts.
- `tokenVersion` should be included in JWT payload and compared in `JwtAuthGuard`.
- Increment `tokenVersion` after password reset, password change, suspension, and security-critical account changes.

### New `account_tokens` table

Purpose: verification and password reset tokens.

Suggested fields:

- `id`
- `userId`
- `type` (`email_verification`, `password_reset`, `news_unsubscribe`)
- `tokenHash`
- `expiresAt`
- `usedAt`
- `createdAt`
- `createdIp`
- `userAgent`

Rules:

- Store only token hashes, never raw tokens.
- Tokens are single-use.
- Expired and used tokens must not work.
- API responses must not reveal whether an email exists.

### New `email_delivery_logs` table

Purpose: operational visibility without storing sensitive content.

Suggested fields:

- `id`
- `userId`
- `email`
- `type`
- `provider`
- `status` (`queued`, `sent`, `failed`, `skipped`)
- `providerMessageId`
- `errorCode`
- `errorMessage`
- `attemptCount`
- `lastAttemptAt`
- `createdAt`

Rules:

- Do not store raw verification/reset tokens.
- Do not store full email body unless a privacy policy explicitly allows it.

## Required Backend Flows

### Registration Verification

1. Client/worker registers.
2. Account is created as unverified.
3. Verification token is generated, hashed, stored, and emailed.
4. User verifies via token.
5. `emailVerifiedAt` is set.
6. Protected marketplace actions require verified email.

Decision needed:

- Whether login itself is blocked before verification, or login is allowed but protected actions are blocked.
- Recommended: allow login with a restricted UI state, but block protected actions in backend until verification.

### Password Reset

1. User requests reset by email.
2. API returns generic success regardless of account existence.
3. If account exists, create single-use expiring token and email it.
4. User submits token and new password.
5. Password is updated.
6. `passwordChangedAt` is set.
7. `tokenVersion` increments to invalidate existing JWT sessions.
8. Security notification email is sent.

### Platform-News Notifications

1. News emails require explicit opt-in.
2. Store consent timestamp and source.
3. Provide account preference UI/API.
4. Every news email includes one-click unsubscribe.
5. Transactional/security emails remain separate and do not depend on marketing/news opt-in.

## Implementation Order

1. Add migration for user verification/session fields, account tokens, and email delivery logs.
2. Extend `UserEntity` and add token/delivery entities.
3. Update JWT issuance and `JwtAuthGuard` to include/validate `tokenVersion`.
4. Add account token service with hashing, expiry, single-use validation, and cleanup.
5. Extend `MailService` with typed account email methods and clean Bulgarian template/log encoding.
6. Add auth endpoints:
   - `POST /auth/verify-email`
   - `POST /auth/resend-verification`
   - `POST /auth/request-password-reset`
   - `POST /auth/reset-password`
7. Add backend permission checks so unverified users cannot create requests, upload media, apply, assign, review, or modify marketplace data.
8. Add notification preference endpoints for news opt-in/unsubscribe.
9. Add tests for token expiry, reuse, malformed tokens, suspended users, JWT invalidation, and account enumeration protection.
10. Update frontend registration/login/account screens after backend behavior is stable.

## Acceptance Criteria

- New account receives verification email and becomes verified with a valid token.
- Unverified account cannot perform protected marketplace actions.
- Verification resend is rate-limited and does not reveal account existence.
- Password reset works once and expires correctly.
- Old JWT sessions stop working after password change.
- Suspended accounts cannot verify/reset back into active behavior without admin reactivation.
- News emails are sent only to opted-in users.
- Unsubscribe takes effect immediately.
- No raw tokens are stored in the database or logs.
- No SMTP/API credentials are committed.

## Risks

- Existing production currently has only the admin account after cleanup. The migration must preserve that account and mark or allow it as verified.
- The current mail service has mojibake strings; extending it without cleanup will make customer-facing emails look broken.
- `TYPEORM_SYNCHRONIZE=false` means every entity change needs a matching SQL migration before production deploy.
- If `tokenVersion` is added but not enforced everywhere, old sessions may remain valid after password resets.

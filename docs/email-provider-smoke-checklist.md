# Bricky Email Provider And Smoke Test Checklist

## Purpose

This document describes how to configure and verify the Sprint 2 transactional email slice without committing secrets.

Covered flows:

- account registration email verification;
- resend verification link and 6-digit confirmation code;
- forgotten password;
- password reset;
- password-changed notification;
- email delivery logging.

## Environment Variables

Configure these in the backend runtime environment:

```env
FRONTEND_URL=https://bricky.bg
PUBLIC_APP_URL=https://bricky.bg
MAIL_HOST=<SMTP_HOST>
MAIL_PORT=587
MAIL_USER=<SMTP_USERNAME>
MAIL_PASS=<SMTP_PASSWORD>
MAIL_FROM="Bricky <no-reply@bricky.bg>"
```

Rules:

- do not commit real SMTP credentials;
- keep `MAIL_PASS` only in the VPS/backend environment;
- production must use `TYPEORM_SYNCHRONIZE=false`;
- `FRONTEND_URL` must match the real public app URL, otherwise email links will point to the wrong host.

## Google SMTP Configuration

For Google SMTP, use an app password, not the normal Google account password.

Recommended production/staging values:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=<FULL_GMAIL_OR_WORKSPACE_EMAIL>
MAIL_PASS=<GOOGLE_APP_PASSWORD>
MAIL_FROM="Bricky <FULL_GMAIL_OR_WORKSPACE_EMAIL>"
```

Google setup requirements:

1. Enable 2-Step Verification for the sending Google account.
2. Create an App Password for mail/SMTP.
3. Store the 16-character app password only in the backend runtime environment.
4. Restart the backend after changing the environment.
5. If Google Workspace blocks SMTP auth, allow app passwords or use a dedicated transactional provider instead.

Never commit the Google app password. If it is exposed, revoke it in Google Account settings and generate a new one.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace placeholders with local database values.
3. Use a sandbox SMTP provider for local testing.
4. Start the backend.
5. Start the frontend.

## Smoke Test Flow

Use disposable email addresses only.

The repository includes an API smoke helper for the primary gate:

```powershell
$env:API_BASE_URL="https://bricky.bg/api"
$env:SMOKE_EMAIL="bricky-smoke+20260711@example.com"
$env:SMOKE_PASSWORD="Use-A-Disposable-Strong-Password-123!"
$env:SMOKE_ROLE="client"
npm run smoke:email-verification
```

The helper:

1. creates a new client or worker account;
2. confirms login is blocked before verification;
3. waits for the 6-digit code from the real email inbox;
4. verifies `/auth/verify-email-code`;
5. confirms login succeeds after verification.

This smoke test is accepted only when the code arrives through the configured real SMTP provider and the final login succeeds.

### 1. Registration Verification

1. Register a new client.
2. Confirm the response asks the user to verify email.
3. Confirm an `email_verification` row is created in `account_tokens`.
4. Confirm an `email_delivery_logs` row is created for `email_verification`.
5. Confirm the delivery log stores `status = sent` and `providerMessageId` when the provider returns one.
6. Confirm login is rejected before verification.
7. Open the verification link from the email.
8. Confirm `users.emailVerifiedAt` is set.
9. Register a second disposable account and verify it by entering email + the 6-digit code at `/auth/verify-email`.
10. Confirm the verification code is consumed once and cannot be reused.
11. Confirm login succeeds after verification.

### 2. Resend Verification

1. Register another disposable account.
2. Attempt login before verification.
3. Use the resend verification button on the login page.
4. Confirm a new verification email arrives.
5. Repeat until the resend limit is reached within 60 minutes.
6. Confirm the next request returns `429 Too Many Requests`.
7. Note: every verification email creates both a link token and a code token, so the stored `account_tokens` count increases by two per email.

### 3. Password Reset

1. Open `/auth/forgot-password`.
2. Request a reset for a verified disposable account.
3. Confirm a `password_reset` row is created in `account_tokens`.
4. Confirm an `email_delivery_logs` row is created for `password_reset`.
5. Confirm provider failure cases store `status = failed`, `errorCode`, and `errorMessage` without storing tokens.
6. Open the reset link from the email.
7. Set a new password.
8. Confirm a `password_changed` email is sent.
9. Confirm old JWT sessions are invalidated by `tokenVersion`.
10. Confirm login works with the new password and fails with the old password.

### 4. Abuse Checks

Verify:

- unknown email reset requests do not reveal account existence;
- suspended accounts cannot receive password reset emails;
- password reset is limited to 3 token issues per user per 60 minutes;
- verification resend is limited by email sends, but each send stores two token rows: one link token and one code token;
- invalid, reused, expired, and malformed tokens fail safely.

### 5. News Preferences And Unsubscribe

1. Open account settings as a client and enable platform news.
2. Confirm `users.newsOptIn = 1`, `newsOptInAt` is set, and `newsOptInSource = account_settings`.
3. Disable platform news from settings.
4. Confirm `users.newsOptIn = 0` and `newsUnsubscribedAt` is set.
5. Generate a `news_unsubscribe` token for a disposable user.
6. Open `/auth/news-unsubscribe?token=<TOKEN>`.
7. Confirm the token is consumed once and `newsOptIn` is disabled.
8. Confirm opening the same link again fails safely.

## SQL Inspection Helpers

```sql
SELECT id, email, role, accountStatus, emailVerifiedAt, tokenVersion
FROM users
ORDER BY id DESC
LIMIT 10;

SELECT id, userId, type, expiresAt, usedAt, createdAt
FROM account_tokens
ORDER BY id DESC
LIMIT 20;

SELECT id, userId, email, type, status, provider, lastAttemptAt, createdAt
FROM email_delivery_logs
ORDER BY id DESC
LIMIT 20;
```

## Retention Cleanup

Account verification, password reset, and news-unsubscribe tokens are operational security records, not permanent product history.

Default retention policy:

- expired account tokens: keep for 30 days after expiry, then remove;
- used account tokens: keep for 30 days after use, then remove;
- email delivery logs: keep for 180 days, then remove.

Application code exposes the same retention behavior through `AccountSecurityService.cleanupExpiredSecurityData`.

Manual SQL runbook:

```bash
mysql -u <MYSQL_USER> -p <DATABASE_NAME> < scripts/cleanup-account-security-data.sql
```

Before running the script:

1. Create a fresh `mysqldump` backup.
2. Confirm the target database is staging or explicitly approved production.
3. Review and adjust `@token_retention_days` and `@email_log_retention_days` if the deployment policy changes.

The cleanup script does not modify users, requests, media, reviews, admin records, or production content.

## Production Release Gate

Before enabling this flow publicly:

- backend and frontend builds must pass;
- account-security, auth, mail, and mock-auth tests must pass;
- SMTP smoke test must pass with disposable accounts;
- both verification paths must pass: email link and email + 6-digit code;
- no real SMTP credentials may appear in git history;
- production `FRONTEND_URL` must point to `https://bricky.bg`;
- rollback must include disabling the mail provider env values and restarting the backend.

## Production Smoke Evidence - 2026-07-11

Result: passed against `https://bricky.bg/api` with Google SMTP.

Evidence:

- production backend health returned `status = ok`, `database = ok`, and `storage = ok`;
- `/auth/verify-email-code` was available in production and no longer returned `404`;
- a disposable client account was registered with a Gmail plus-address;
- login before verification was rejected with the expected unverified-email response;
- the verification email arrived through the configured Gmail SMTP account;
- the 6-digit email code was consumed successfully by `/auth/verify-email-code`;
- the API returned a verified user with `emailVerifiedAt` set;
- login after verification succeeded and returned an access token.

No SMTP credentials, verification code, JWT, or passwords were recorded in this document.

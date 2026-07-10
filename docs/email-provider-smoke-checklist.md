# Bricky Email Provider And Smoke Test Checklist

## Purpose

This document describes how to configure and verify the Sprint 2 transactional email slice without committing secrets.

Covered flows:

- account registration email verification;
- resend verification link;
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

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace placeholders with local database values.
3. Use a sandbox SMTP provider for local testing.
4. Start the backend.
5. Start the frontend.

## Smoke Test Flow

Use disposable email addresses only.

### 1. Registration Verification

1. Register a new client.
2. Confirm the response asks the user to verify email.
3. Confirm an `email_verification` row is created in `account_tokens`.
4. Confirm an `email_delivery_logs` row is created for `email_verification`.
5. Confirm login is rejected before verification.
6. Open the verification link from the email.
7. Confirm `users.emailVerifiedAt` is set.
8. Confirm login succeeds after verification.

### 2. Resend Verification

1. Register another disposable account.
2. Attempt login before verification.
3. Use the resend verification button on the login page.
4. Confirm a new verification email arrives.
5. Repeat until the fourth request within 60 minutes.
6. Confirm the fourth request returns `429 Too Many Requests`.

### 3. Password Reset

1. Open `/auth/forgot-password`.
2. Request a reset for a verified disposable account.
3. Confirm a `password_reset` row is created in `account_tokens`.
4. Confirm an `email_delivery_logs` row is created for `password_reset`.
5. Open the reset link from the email.
6. Set a new password.
7. Confirm a `password_changed` email is sent.
8. Confirm old JWT sessions are invalidated by `tokenVersion`.
9. Confirm login works with the new password and fails with the old password.

### 4. Abuse Checks

Verify:

- unknown email reset requests do not reveal account existence;
- suspended accounts cannot receive password reset emails;
- verification resend and password reset are limited to 3 token issues per user per 60 minutes;
- invalid, reused, expired, and malformed tokens fail safely.

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

## Production Release Gate

Before enabling this flow publicly:

- backend and frontend builds must pass;
- account-security and auth tests must pass;
- SMTP smoke test must pass with disposable accounts;
- no real SMTP credentials may appear in git history;
- production `FRONTEND_URL` must point to `https://bricky.bg`;
- rollback must include disabling the mail provider env values and restarting the backend.


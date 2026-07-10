import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService email verification gate', () => {
  const baseUser = {
    id: 1008,
    role: 'client',
    name: 'Client Test',
    email: 'client@example.com',
    password: '',
    accountStatus: 'active' as const,
    emailVerificationRequired: true,
    emailVerifiedAt: null,
    tokenVersion: 0,
  };

  const createService = (user: any) => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findOne: jest.fn().mockResolvedValue(user),
      markEmailVerified: jest.fn().mockResolvedValue({ ...user, emailVerifiedAt: new Date(), emailVerificationRequired: false }),
      updatePasswordAndRevokeSessions: jest.fn(),
      getNewsPreferences: jest.fn().mockResolvedValue({
        newsOptIn: false,
        newsOptInAt: null,
        newsOptInSource: null,
        newsUnsubscribedAt: null,
      }),
      updateNewsPreference: jest.fn().mockResolvedValue({
        newsOptIn: true,
        newsOptInAt: new Date('2026-07-10T10:00:00.000Z'),
        newsOptInSource: 'account_settings',
        newsUnsubscribedAt: null,
      }),
      markNewsUnsubscribed: jest.fn().mockResolvedValue({
        newsOptIn: false,
        newsOptInAt: null,
        newsOptInSource: 'account_settings',
        newsUnsubscribedAt: new Date('2026-07-10T11:00:00.000Z'),
      }),
    };
    const workers = {};
    const accountSecurity = {
      assertTokenIssueAllowed: jest.fn().mockResolvedValue(undefined),
      issueToken: jest.fn().mockResolvedValue({ rawToken: 'raw-token' }),
      issueTokenWithRawToken: jest.fn().mockResolvedValue({ rawToken: '123456' }),
      consumeToken: jest.fn().mockResolvedValue({ userId: baseUser.id, type: 'news_unsubscribe' }),
      consumeTokenForUser: jest.fn().mockResolvedValue({ userId: baseUser.id, type: 'email_verification' }),
      logEmailDelivery: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const mail = {
      sendEmailVerification: jest.fn().mockResolvedValue({
        status: 'sent',
        providerMessageId: 'verification-message-id',
      }),
      sendPasswordReset: jest.fn().mockResolvedValue({
        status: 'sent',
        providerMessageId: 'reset-message-id',
      }),
      sendPasswordChanged: jest.fn().mockResolvedValue({
        status: 'sent',
        providerMessageId: 'changed-message-id',
      }),
    };
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    return {
      service: new AuthService(users as any, workers as any, accountSecurity as any, mail as any, jwt as any),
      accountSecurity,
      mail,
      users,
      jwt,
    };
  };

  it('rejects login before email confirmation', async () => {
    const password = await bcrypt.hash('secret123', 10);
    const { service } = createService({ ...baseUser, password });

    await expect(service.login({ email: baseUser.email, password: 'secret123' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('issues a JWT after email confirmation', async () => {
    const password = await bcrypt.hash('secret123', 10);
    const { service, jwt } = createService({
      ...baseUser,
      password,
      emailVerifiedAt: new Date('2026-07-10T10:00:00.000Z'),
    });

    const result = await service.login({ email: baseUser.email, password: 'secret123' });

    expect(result.token).toBe('signed-token');
    expect(jwt.signAsync).toHaveBeenCalledWith({ id: baseUser.id, role: baseUser.role, tokenVersion: 0 });
  });

  it('rate limits verification resend before sending email', async () => {
    const { service, accountSecurity, mail } = createService(baseUser);

    await service.resendVerification(baseUser.email);

    expect(accountSecurity.assertTokenIssueAllowed).toHaveBeenCalledWith(baseUser.id, 'email_verification', {
      maxAttempts: 6,
      windowMinutes: 60,
    });
    expect(mail.sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ email: baseUser.email, token: 'raw-token', code: expect.stringMatching(/^\d{6}$/) }),
    );
    expect(accountSecurity.logEmailDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: baseUser.id,
        email: baseUser.email,
        type: 'email_verification',
        status: 'sent',
        providerMessageId: 'verification-message-id',
      }),
    );
  });

  it('verifies email with a short code for the account email', async () => {
    const { service, accountSecurity, users } = createService(baseUser);

    await service.verifyEmailCode(baseUser.email, '123456');

    expect(accountSecurity.consumeTokenForUser).toHaveBeenCalledWith(baseUser.id, '123456', 'email_verification');
    expect(users.findByEmail).toHaveBeenCalledWith(baseUser.email);
  });

  it('rate limits password reset before sending email', async () => {
    const { service, accountSecurity, mail } = createService(baseUser);

    await service.requestPasswordReset(baseUser.email);

    expect(accountSecurity.assertTokenIssueAllowed).toHaveBeenCalledWith(baseUser.id, 'password_reset', {
      maxAttempts: 3,
      windowMinutes: 60,
    });
    expect(mail.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ email: baseUser.email, token: 'raw-token' }),
    );
    expect(accountSecurity.logEmailDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: baseUser.id,
        email: baseUser.email,
        type: 'password_reset',
        status: 'sent',
        providerMessageId: 'reset-message-id',
      }),
    );
  });

  it('updates news preferences for the authenticated account', async () => {
    const { service, users } = createService(baseUser);

    const result = await service.updateNewsPreferences(baseUser.id, true, 'account_settings');

    expect(users.updateNewsPreference).toHaveBeenCalledWith(baseUser.id, true, 'account_settings');
    expect(result.preferences.newsOptIn).toBe(true);
  });

  it('issues a news unsubscribe token without exposing stored hashes', async () => {
    const { service, accountSecurity } = createService(baseUser);

    const result = await service.issueNewsUnsubscribeToken(baseUser.id);

    expect(accountSecurity.issueToken).toHaveBeenCalledWith(baseUser.id, 'news_unsubscribe', 30 * 24 * 60);
    expect(result).toEqual({ token: 'raw-token' });
  });

  it('unsubscribes news through a single-use token', async () => {
    const { service, accountSecurity, users } = createService(baseUser);

    await expect(service.unsubscribeNews('raw-news-token')).resolves.toEqual({
      message: 'Отписването от новини е успешно.',
    });

    expect(accountSecurity.consumeToken).toHaveBeenCalledWith('raw-news-token', 'news_unsubscribe');
    expect(users.markNewsUnsubscribed).toHaveBeenCalledWith(baseUser.id);
  });
});

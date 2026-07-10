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
      updatePasswordAndRevokeSessions: jest.fn(),
    };
    const workers = {};
    const accountSecurity = {
      assertTokenIssueAllowed: jest.fn().mockResolvedValue(undefined),
      issueToken: jest.fn().mockResolvedValue({ rawToken: 'raw-token' }),
      logEmailDelivery: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const mail = {
      sendEmailVerification: jest.fn().mockResolvedValue('sent'),
      sendPasswordReset: jest.fn().mockResolvedValue('sent'),
    };
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    return {
      service: new AuthService(users as any, workers as any, accountSecurity as any, mail as any, jwt as any),
      accountSecurity,
      mail,
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
      maxAttempts: 3,
      windowMinutes: 60,
    });
    expect(mail.sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ email: baseUser.email, token: 'raw-token' }),
    );
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
  });
});

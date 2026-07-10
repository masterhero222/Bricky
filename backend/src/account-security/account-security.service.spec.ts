import { BadRequestException } from '@nestjs/common';
import { AccountSecurityService } from './account-security.service';

describe('AccountSecurityService', () => {
  const createService = () => {
    const tokenRepo = {
      create: jest.fn((row) => ({ id: 1, ...row })),
      save: jest.fn(async (row) => row),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };
    const deliveryRepo = {
      create: jest.fn((row) => ({ id: 1, ...row })),
      save: jest.fn(async (row) => row),
      delete: jest.fn(),
    };

    return {
      service: new AccountSecurityService(tokenRepo as any, deliveryRepo as any),
      tokenRepo,
      deliveryRepo,
    };
  };

  it('issues a raw token while storing only its hash', async () => {
    const { service, tokenRepo } = createService();

    const result = await service.issueToken(42, 'email_verification', 30);

    expect(result.rawToken).toHaveLength(43);
    expect(tokenRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        type: 'email_verification',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(tokenRepo.create.mock.calls[0][0].tokenHash).not.toBe(result.rawToken);
  });

  it('consumes a valid token once', async () => {
    const { service, tokenRepo } = createService();
    const rawToken = service.createRawToken();
    const tokenHash = service.hashToken(rawToken);
    const row = {
      id: 7,
      userId: 42,
      type: 'password_reset',
      tokenHash,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    tokenRepo.findOne.mockResolvedValue(row);

    await expect(service.consumeToken(rawToken, 'password_reset')).resolves.toMatchObject({
      id: 7,
      userId: 42,
    });
    expect(row.usedAt).toBeInstanceOf(Date);
    expect(tokenRepo.save).toHaveBeenCalledWith(row);
  });

  it('rejects missing or too-short tokens', async () => {
    const { service } = createService();

    await expect(service.consumeToken('short', 'email_verification')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('normalizes email delivery log addresses', async () => {
    const { service, deliveryRepo } = createService();

    await service.logEmailDelivery({
      email: '  USER@Example.COM ',
      type: 'password_reset',
      status: 'queued',
    });

    expect(deliveryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        type: 'password_reset',
      }),
    );
  });

  it('allows token issuing below the rate limit', async () => {
    const { service, tokenRepo } = createService();
    tokenRepo.count.mockResolvedValue(2);

    await expect(
      service.assertTokenIssueAllowed(42, 'password_reset', { maxAttempts: 3, windowMinutes: 60 }),
    ).resolves.toBeUndefined();

    expect(tokenRepo.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 42,
          type: 'password_reset',
          createdAt: expect.any(Object),
        }),
      }),
    );
  });

  it('rejects token issuing after too many recent attempts', async () => {
    const { service, tokenRepo } = createService();
    tokenRepo.count.mockResolvedValue(3);

    await expect(
      service.assertTokenIssueAllowed(42, 'email_verification', { maxAttempts: 3, windowMinutes: 60 }),
    ).rejects.toMatchObject({
      status: 429,
    });
  });

  it('cleans expired security tokens and old email delivery logs with retention windows', async () => {
    const { service, tokenRepo, deliveryRepo } = createService();
    tokenRepo.delete
      .mockResolvedValueOnce({ affected: 4 })
      .mockResolvedValueOnce({ affected: 2 });
    deliveryRepo.delete.mockResolvedValueOnce({ affected: 9 });

    const result = await service.cleanupExpiredSecurityData({
      tokenRetentionDays: 15,
      emailLogRetentionDays: 90,
    });

    expect(result).toMatchObject({
      tokenRetentionDays: 15,
      emailLogRetentionDays: 90,
      expiredTokens: 4,
      usedTokens: 2,
      emailLogs: 9,
    });
    expect(result.tokenCutoff).toBeInstanceOf(Date);
    expect(result.emailLogCutoff).toBeInstanceOf(Date);
    expect(tokenRepo.delete).toHaveBeenNthCalledWith(1, {
      expiresAt: expect.any(Object),
    });
    expect(tokenRepo.delete).toHaveBeenNthCalledWith(2, {
      usedAt: expect.any(Object),
    });
    expect(deliveryRepo.delete).toHaveBeenCalledWith({
      createdAt: expect.any(Object),
    });
  });
});

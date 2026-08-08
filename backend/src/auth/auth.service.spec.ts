import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  const manager = { transactionMarker: true } as any;
  let users: any;
  let workers: any;
  let referrals: any;
  let dataSource: any;
  let mail: any;
  let passwordResetTokens: any;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 42, email: 'new@bricky.bg', role: 'client' }),
      createClientProfile: jest.fn().mockResolvedValue({ userId: 42 }),
    };
    workers = {
      createWorkerProfile: jest.fn().mockResolvedValue({ userId: 42 }),
    };
    referrals = {
      validateCode: jest.fn().mockResolvedValue({ ok: true }),
      attachRegistration: jest.fn().mockResolvedValue(null),
    };
    dataSource = {
      transaction: jest.fn(async (callback: (transactionManager: any) => Promise<any>) => callback(manager)),
    };
    mail = { sendPasswordResetLink: jest.fn().mockResolvedValue(undefined) };
    passwordResetTokens = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 1, ...value, createdAt: new Date() })),
    };
    service = new AuthService(
      users,
      workers,
      {} as any,
      referrals,
      dataSource,
      mail,
      passwordResetTokens,
    );
  });

  it('creates a client and its profile in one transaction', async () => {
    const result = await service.register({
      role: 'client',
      email: 'new@bricky.bg',
      password: 'password123',
      profile: { displayName: 'Нов клиент', phonePrivate: '0888000000' },
      referralCode: 'BRCLIENT',
    } as any);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@bricky.bg', role: 'client' }),
      manager,
    );
    expect(users.createClientProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, displayName: 'Нов клиент' }),
      manager,
    );
    expect(referrals.attachRegistration).toHaveBeenCalledWith('BRCLIENT', 42, 'client', manager);
    expect(result.user.id).toBe(42);
  });

  it('creates a worker and skills in the same transaction', async () => {
    users.create.mockResolvedValue({ id: 77, email: 'worker@bricky.bg', role: 'worker' });

    const result = await service.register({
      role: 'worker',
      email: 'worker@bricky.bg',
      password: 'password123',
      profile: {
        publicName: 'Нов майстор',
        city: 'София',
        skills: ['ВиК', 'Плочки'],
      },
      referralCode: 'BRWORKER',
    } as any);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(workers.createWorkerProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 77, publicName: 'Нов майстор', skills: ['ВиК', 'Плочки'] }),
      manager,
    );
    expect(referrals.attachRegistration).toHaveBeenCalledWith('BRWORKER', 77, 'worker', manager);
    expect(users.createClientProfile).not.toHaveBeenCalled();
    expect(result.user.id).toBe(77);
  });

  it('does not attach a referral when profile creation fails', async () => {
    users.createClientProfile.mockRejectedValue(new Error('profile insert failed'));

    await expect(
      service.register({
        role: 'client',
        email: 'new@bricky.bg',
        password: 'password123',
        profile: { displayName: 'Нов клиент' },
        referralCode: 'BRCLIENT',
      } as any),
    ).rejects.toThrow('profile insert failed');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(referrals.attachRegistration).not.toHaveBeenCalled();
  });

  it('rejects duplicate email before opening a transaction', async () => {
    users.findByEmail.mockResolvedValue({ id: 5, email: 'used@bricky.bg' });

    await expect(
      service.register({
        role: 'client',
        email: 'used@bricky.bg',
        password: 'password123',
        profile: { displayName: 'Клиент' },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(users.create).not.toHaveBeenCalled();
  });

  it('returns the same reset response for unknown accounts without sending email', async () => {
    users.findByEmail.mockResolvedValue(null);

    const result = await service.requestPasswordReset('missing@bricky.bg');

    expect(result.message).toContain('Ако имейлът е регистриран');
    expect(mail.sendPasswordResetLink).not.toHaveBeenCalled();
  });

  it('stores a hash and emails the raw one-time reset token', async () => {
    users.findByEmail.mockResolvedValue({
      id: 42,
      email: 'client@bricky.bg',
      name: 'Client',
      status: 'active',
    });

    await service.requestPasswordReset('CLIENT@BRICKY.BG');

    expect(passwordResetTokens.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        consumedAt: null,
      }),
    );
    const resetUrl = mail.sendPasswordResetLink.mock.calls[0][0].resetUrl;
    expect(resetUrl).toMatch(/\/reset-password\?token=[a-f0-9]{64}$/);
    expect(resetUrl).not.toContain(passwordResetTokens.save.mock.calls[0][0].tokenHash);
  });

  it('consumes the token and updates both password columns transactionally', async () => {
    const rawToken = 'a'.repeat(64);
    const tokenRepo = {
      findOne: jest.fn().mockResolvedValue({
        userId: 42,
        tokenHash: expect.any(String),
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 42,
        status: 'active',
        password: 'old',
        passwordHash: 'old',
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      increment: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback({
        getRepository: jest.fn((entity) =>
          entity.name === 'PasswordResetTokenEntity' ? tokenRepo : userRepo,
        ),
      }),
    );

    await expect(service.resetPassword(rawToken, 'new-password')).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(userRepo.update).toHaveBeenCalledWith(
      { id: 42 },
      expect.objectContaining({ password: expect.any(String), passwordHash: expect.any(String) }),
    );
    expect(tokenRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 }),
      expect.objectContaining({ consumedAt: expect.any(Date) }),
    );
    expect(userRepo.increment).toHaveBeenCalledWith({ id: 42 }, 'authVersion', 1);
  });
});

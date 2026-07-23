import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  const manager = { transactionMarker: true } as any;
  let users: any;
  let workers: any;
  let referrals: any;
  let dataSource: any;
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
    service = new AuthService(users, workers, {} as any, referrals, dataSource);
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
});

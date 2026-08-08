import { BadRequestException } from '@nestjs/common';
import { ClientProfileEntity } from './client-profile.entity';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';

describe('UsersService account settings', () => {
  function setup(role: 'client' | 'worker' = 'client') {
    const user = {
      id: 12,
      name: role === 'client' ? 'Client Name' : 'Worker Name',
      email: `${role}@bricky.test`,
      role,
      status: 'active',
      password: 'hash',
      passwordHash: 'hash',
    } as UserEntity;
    const clientProfile = {
      userId: 12,
      displayName: 'Client Name',
      phonePrivate: '0888000000',
      defaultAddress: 'Sofia center',
    } as ClientProfileEntity;
    const workerProfile = {
      userId: 12,
      publicName: 'Worker Name',
      phonePrivate: '0899000000',
      defaultAddress: 'Plovdiv center',
      city: 'Plovdiv',
    } as WorkerProfileEntity;

    const userRepo = {
      findOne: jest.fn(async ({ where }: any) => {
        if (where?.id === 12) return user;
        if (where?.email) return null;
        return null;
      }),
      update: jest.fn(),
      manager: null as any,
    };
    const clientRepo = {
      findOne: jest.fn().mockResolvedValue(clientProfile),
      save: jest.fn(async (value) => value),
    };
    const workerRepo = {
      findOne: jest.fn().mockResolvedValue(workerProfile),
      save: jest.fn(async (value) => value),
    };
    const notificationsRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, userId: 12, message: 'New request', isRead: false },
      ]),
      count: jest.fn().mockResolvedValue(3),
    };
    const plansRepo = {
      findOne: jest.fn().mockResolvedValue(
        role === 'worker'
          ? { workerUserId: 12, planKey: 'pro', status: 'active', endsAt: null }
          : null,
      ),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === UserEntity) return userRepo;
        if (entity === ClientProfileEntity) return clientRepo;
        if (entity === WorkerProfileEntity) return workerRepo;
        throw new Error('Unexpected repository');
      }),
    };
    userRepo.manager = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    const service = new UsersService(
      userRepo as any,
      clientRepo as any,
      workerRepo as any,
      notificationsRepo as any,
      plansRepo as any,
    );
    return { service, user, userRepo, clientRepo, workerRepo, notificationsRepo };
  }

  it('returns normalized client contact and unread notification count', async () => {
    const { service, notificationsRepo } = setup('client');

    await expect(service.getAccount(12)).resolves.toEqual(
      expect.objectContaining({
        role: 'client',
        email: 'client@bricky.test',
        profile: {
          name: 'Client Name',
          phone: '0888000000',
          address: 'Sofia center',
        },
        subscription: null,
        notifications: expect.objectContaining({ unreadCount: 3 }),
      }),
    );
    expect(notificationsRepo.count).toHaveBeenCalledWith({
      where: { userId: 12, isRead: false },
    });
  });

  it('returns the real worker plan with private contact fields', async () => {
    const { service } = setup('worker');

    await expect(service.getAccount(12)).resolves.toEqual(
      expect.objectContaining({
        role: 'worker',
        profile: expect.objectContaining({
          phone: '0899000000',
          address: 'Plovdiv center',
        }),
        subscription: expect.objectContaining({ planKey: 'pro', status: 'active' }),
      }),
    );
  });

  it('rejects a duplicate email before saving a profile', async () => {
    const { service, userRepo, clientRepo } = setup('client');
    userRepo.findOne.mockImplementation(async ({ where }: any) =>
      where?.email ? { id: 99, email: where.email } : { id: 12, email: 'client@bricky.test', role: 'client' },
    );

    await expect(
      service.updateAccountProfile(12, { email: 'taken@bricky.test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(clientRepo.save).not.toHaveBeenCalled();
  });

});

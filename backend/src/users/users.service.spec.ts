import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ClientProfileEntity } from './client-profile.entity';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { RequestApplicationEntity } from '../requests/entities/request-application.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';

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
      update: jest.fn(),
    };
    const notificationsRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 1, userId: 12, message: 'New request', isRead: false },
        ]),
      count: jest.fn().mockResolvedValue(3),
    };
    const plansRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          role === 'worker'
            ? {
                workerUserId: 12,
                planKey: 'pro',
                status: 'active',
                endsAt: null,
              }
            : null,
        ),
    };
    const requestRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const applicationRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const reviewRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const mediaRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === UserEntity) return userRepo;
        if (entity === ClientProfileEntity) return clientRepo;
        if (entity === WorkerProfileEntity) return workerRepo;
        if (entity === RepairRequestEntity) return requestRepo;
        if (entity === RequestApplicationEntity) return applicationRepo;
        if (entity === ReviewEntity) return reviewRepo;
        if (entity === MediaAssetEntity) return mediaRepo;
        throw new Error('Unexpected repository');
      }),
    };
    userRepo.manager = {
      getRepository: manager.getRepository,
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    const service = new UsersService(
      userRepo as any,
      clientRepo as any,
      workerRepo as any,
      notificationsRepo as any,
      plansRepo as any,
    );
    return {
      service,
      user,
      userRepo,
      clientRepo,
      workerRepo,
      notificationsRepo,
      requestRepo,
      applicationRepo,
      reviewRepo,
      mediaRepo,
    };
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
        subscription: expect.objectContaining({
          planKey: 'pro',
          status: 'active',
        }),
      }),
    );
  });

  it('rejects a duplicate email before saving a profile', async () => {
    const { service, userRepo, clientRepo } = setup('client');
    userRepo.findOne.mockImplementation(async ({ where }: any) =>
      where?.email
        ? { id: 99, email: where.email }
        : { id: 12, email: 'client@bricky.test', role: 'client' },
    );

    await expect(
      service.updateAccountProfile(12, { email: 'taken@bricky.test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(clientRepo.save).not.toHaveBeenCalled();
  });

  it('creates the missing legacy client profile on first save', async () => {
    const { service, clientRepo } = setup('client');
    clientRepo.findOne.mockResolvedValue(null);
    clientRepo.create = jest.fn((value) => value);

    await service.updateAccountProfile(12, {
      name: 'Updated Client',
      phone: '0888 123 456',
      address: 'София, бул. България 1',
    });

    expect(clientRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 12, displayName: 'Updated Client' }),
    );
    expect(clientRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        phonePrivate: '+359888123456',
        defaultAddress: 'София, бул. България 1',
      }),
    );
  });

  it('exports account data without password or internal storage keys', async () => {
    const { service, mediaRepo } = setup('client');
    mediaRepo.find.mockResolvedValue([
      {
        id: 7,
        ownerUserId: 12,
        kind: 'request_before',
        storageKey: '/private/server/path/photo.jpg',
        publicUrl: '/uploads/requests/7/photo.jpg',
        moderationStatus: 'approved',
        createdAt: new Date('2026-08-08T10:00:00Z'),
      },
    ]);

    const exported = await service.exportAccountData(12);

    expect(exported.account).not.toHaveProperty('password');
    expect(exported.account).not.toHaveProperty('passwordHash');
    expect(exported.media[0]).not.toHaveProperty('storageKey');
    expect(exported.media[0]).toEqual(
      expect.objectContaining({ publicUrl: '/uploads/requests/7/photo.jpg' }),
    );
  });

  it('blocks deactivation while the user has an active request', async () => {
    const { service, user, requestRepo } = setup('client');
    user.passwordHash = await bcrypt.hash('current-password', 4);
    requestRepo.count.mockResolvedValue(1);

    await expect(
      service.deactivateAccount(12, { currentPassword: 'current-password' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivates a worker, invalidates sessions and hides the profile', async () => {
    const { service, user, userRepo, workerRepo } = setup('worker');
    user.passwordHash = await bcrypt.hash('current-password', 4);
    user.authVersion = 3;

    await expect(
      service.deactivateAccount(12, { currentPassword: 'current-password' }),
    ).resolves.toEqual(expect.objectContaining({ deactivated: true }));

    expect(userRepo.update).toHaveBeenCalledWith(
      { id: 12 },
      { status: 'deleted', authVersion: 4 },
    );
    expect(workerRepo.update).toHaveBeenCalledWith(
      { userId: 12 },
      { visibilityStatus: 'private' },
    );
  });
});

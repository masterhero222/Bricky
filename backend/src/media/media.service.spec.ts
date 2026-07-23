import { BadRequestException } from '@nestjs/common';
import { Not } from 'typeorm';
import { MediaService } from './media.service';

describe('MediaService moderation', () => {
  it.each([
    { publicUrl: 'data:image/png;base64,abc', storageKey: '/uploads/photo.png' },
    { publicUrl: '/uploads/photo.png', storageKey: 'data:image/png;base64,abc' },
  ])('rejects inline production media storage', async ({ publicUrl, storageKey }) => {
    const mediaRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const service = new MediaService(mediaRepo as any);

    await expect(
      service.createAsset({
        ownerUserId: 201,
        kind: 'worker_gallery',
        publicUrl,
        storageKey,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mediaRepo.save).not.toHaveBeenCalled();
  });

  it('creates new media as pending until an admin moderates it', async () => {
    const mediaRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 10, ...value })),
    };
    const service = new MediaService(mediaRepo as any);

    const saved = await service.createAsset({
      ownerUserId: 201,
      workerUserId: 201,
      kind: 'worker_avatar',
      publicUrl: '/uploads/users/201/avatar/new.jpg',
      storageKey: 'users/201/avatar/new.jpg',
      mimeType: 'image/jpeg',
    });

    expect(saved).toEqual(
      expect.objectContaining({
        id: 10,
        storageProvider: 'vps',
        moderationStatus: 'pending',
      }),
    );
  });

  it('moderates all before photos belonging to one request', async () => {
    const mediaRows = [{ id: 1 }, { id: 2 }];
    const mediaRepo = {
      update: jest.fn().mockResolvedValue({ affected: 2 }),
      find: jest.fn().mockResolvedValue(mediaRows),
    };
    const service = new MediaService(mediaRepo as any);

    const result = await service.setRequestMediaModeration(55, 'request_before', 'approved');

    expect(mediaRepo.update).toHaveBeenCalledWith(
      { requestId: 55, kind: 'request_before' },
      { moderationStatus: 'approved' },
    );
    expect(mediaRepo.find).toHaveBeenCalledWith({
      where: { requestId: 55 },
      order: { createdAt: 'ASC' },
    });
    expect(result).toBe(mediaRows);
  });

  it('retires previous approved worker avatars when a new worker avatar is approved', async () => {
    const mediaRepo = {
      update: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue({
        id: 42,
        workerUserId: 201,
        kind: 'worker_avatar',
        moderationStatus: 'approved',
      }),
    };
    const service = new MediaService(mediaRepo as any);

    await service.setModerationStatus(42, 'approved');

    expect(mediaRepo.update).toHaveBeenNthCalledWith(1, { id: 42 }, { moderationStatus: 'approved' });
    expect(mediaRepo.update).toHaveBeenNthCalledWith(
      2,
      {
        id: Not(42),
        workerUserId: 201,
        kind: 'worker_avatar',
        moderationStatus: 'approved',
      },
      { moderationStatus: 'rejected' },
    );
    expect(mediaRepo.update).toHaveBeenNthCalledWith(
      3,
      {
        id: Not(42),
        ownerUserId: 201,
        kind: 'worker_avatar',
        moderationStatus: 'approved',
      },
      { moderationStatus: 'rejected' },
    );
  });

  it('does not retire gallery media when a gallery image is approved', async () => {
    const mediaRepo = {
      update: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue({
        id: 7,
        workerUserId: 201,
        kind: 'worker_gallery',
        moderationStatus: 'approved',
      }),
    };
    const service = new MediaService(mediaRepo as any);

    await service.setModerationStatus(7, 'approved');

    expect(mediaRepo.update).toHaveBeenCalledTimes(1);
  });
});

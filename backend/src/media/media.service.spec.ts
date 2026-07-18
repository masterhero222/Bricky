import { Not } from 'typeorm';
import { MediaService } from './media.service';

describe('MediaService moderation', () => {
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

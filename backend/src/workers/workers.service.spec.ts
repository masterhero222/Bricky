import { WorkersService } from './workers.service';

describe('WorkersService request history media', () => {
  it('hydrates completed request media with one batched image query', async () => {
    const completedAt = new Date('2026-07-05T10:00:00.000Z');
    const requests = [
      {
        id: 11,
        status: 'completed',
        assignedWorkerId: 7,
        completedAt,
        moderationStatus: 'approved',
        beforePhotos: null,
        afterPhotos: null,
        photos: null,
      },
      {
        id: 12,
        status: 'completed',
        assignedWorkerId: 7,
        completedAt,
        moderationStatus: 'approved',
        beforePhotos: [{ id: 'legacy', url: '/legacy.jpg' }],
        afterPhotos: null,
        photos: null,
      },
    ];
    const requestRepo = {
      find: jest.fn().mockResolvedValue(requests),
    };
    const requestImageRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 101,
          requestId: 11,
          kind: 'before',
          name: 'before.jpg',
          url: '/uploads/requests/before.jpg',
          sortOrder: 0,
        },
        {
          id: 102,
          requestId: 11,
          kind: 'after',
          name: 'after.jpg',
          url: '/uploads/requests/after.jpg',
          sortOrder: 0,
        },
        {
          id: 103,
          requestId: 12,
          kind: 'after',
          name: 'after-2.jpg',
          url: '/uploads/requests/after-2.jpg',
          sortOrder: 0,
        },
      ]),
    };

    const service = new WorkersService(
      {} as any,
      {} as any,
      requestRepo as any,
      requestImageRepo as any,
      { find: jest.fn().mockResolvedValue([{ id: 7, role: 'worker', accountStatus: 'active' }]) } as any,
    );

    const history = await service.getHistoryByUserId(7);

    expect(requestImageRepo.find).toHaveBeenCalledTimes(1);
    expect(requestImageRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requestId: expect.anything() }),
      }),
    );
    expect(history[0].beforePhotos).toEqual([
      expect.objectContaining({
        id: 101,
        kind: 'before',
        url: '/uploads/requests/before.jpg',
      }),
    ]);
    expect(history[0].afterPhotos).toEqual([
      expect.objectContaining({
        id: 102,
        kind: 'after',
        url: '/uploads/requests/after.jpg',
      }),
    ]);
    expect(history[0].photos).toEqual(history[0].beforePhotos);
    expect(history[1].beforePhotos).toEqual([
      { id: 'legacy', url: '/legacy.jpg' },
    ]);
    expect(history[1].afterPhotos).toEqual([
      expect.objectContaining({
        id: 103,
        kind: 'after',
        url: '/uploads/requests/after-2.jpg',
      }),
    ]);
  });

  it('removes suspended workers from the public list', async () => {
    const workerRepository = {
      find: jest.fn().mockResolvedValue([
        { id: 1, userId: 201, moderationStatus: 'approved' },
        { id: 2, userId: 202, moderationStatus: 'approved' },
      ]),
    };
    const galleryRepo = { find: jest.fn().mockResolvedValue([]) };
    const requestRepo = { find: jest.fn().mockResolvedValue([]) };
    const requestImageRepo = { find: jest.fn().mockResolvedValue([]) };
    const usersRepo = {
      find: jest.fn().mockResolvedValue([{ id: 201, role: 'worker', accountStatus: 'active' }]),
    };
    const service = new WorkersService(
      workerRepository as any,
      galleryRepo as any,
      requestRepo as any,
      requestImageRepo as any,
      usersRepo as any,
    );

    const result = await service.getAll();

    expect(result.map((worker) => worker.userId)).toEqual([201]);
  });
});

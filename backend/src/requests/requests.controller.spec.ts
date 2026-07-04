import { BadRequestException } from '@nestjs/common';
import { RequestsController } from './requests.controller';

describe('RequestsController', () => {
  let controller: RequestsController;
  let service: any;

  beforeEach(() => {
    service = {
      draftRequest: jest.fn(),
      create: jest.fn(),
      getByClientUserId: jest.fn(),
      getMapRequests: jest.fn(),
      getForWorkersFeed: jest.fn(),
      getCompletedForWorker: jest.fn(),
      applyToRequest: jest.fn(),
      assignWorker: jest.fn(),
      unassignWorker: jest.fn(),
      completeRequest: jest.fn(),
      addUploadedImages: jest.fn(),
      addUploadedFiles: jest.fn(),
      deleteUploadedImage: jest.fn(),
    };
    controller = new RequestsController(service);
  });

  it('creates a request for a client using the authenticated user id', async () => {
    service.create.mockResolvedValue({ id: 7 });

    await expect(
      controller.create({ user: { id: 101, role: 'client' } }, { clientName: 'Client' } as any),
    ).resolves.toEqual({ id: 7 });
    expect(service.create).toHaveBeenCalledWith(expect.any(Object), 101);
  });

  it('rejects request creation by a worker', async () => {
    await expect(
      controller.create({ user: { id: 201, role: 'worker' } }, {} as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only the current client requests', async () => {
    service.getByClientUserId.mockResolvedValue([{ id: 1 }]);

    await expect(controller.myRequests({ user: { id: 101, role: 'client' } })).resolves.toEqual([
      { id: 1 },
    ]);
    expect(service.getByClientUserId).toHaveBeenCalledWith(101);
  });

  it('rejects the client request list for a worker', async () => {
    await expect(
      controller.myRequests({ user: { id: 201, role: 'worker' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes the authenticated actor to map visibility logic', async () => {
    const actor = { id: 201, role: 'worker' };
    service.getMapRequests.mockResolvedValue([{ id: 4 }]);

    await expect(controller.mapRequests({ user: actor })).resolves.toEqual([{ id: 4 }]);
    expect(service.getMapRequests).toHaveBeenCalledWith(actor);
  });

  it('allows only workers to load the worker feed', async () => {
    service.getForWorkersFeed.mockResolvedValue([{ id: 4 }]);

    await expect(controller.workerFeed({ user: { id: 201, role: 'worker' } })).resolves.toEqual([
      { id: 4 },
    ]);
    await expect(
      controller.workerFeed({ user: { id: 101, role: 'client' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only workers to apply', async () => {
    service.applyToRequest.mockResolvedValue({ id: 9 });

    await expect(controller.apply({ user: { id: 201, role: 'worker' } }, '9')).resolves.toEqual({
      id: 9,
    });
    expect(service.applyToRequest).toHaveBeenCalledWith(9, 201);
    await expect(
      controller.apply({ user: { id: 101, role: 'client' } }, '9'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates the assigned worker id and passes client ownership context', async () => {
    service.assignWorker.mockResolvedValue({ id: 9, assignedWorkerId: 201 });

    await expect(
      controller.assign({ user: { id: 101, role: 'client' } }, '9', { workerUserId: 201 }),
    ).resolves.toEqual({ id: 9, assignedWorkerId: 201 });
    expect(service.assignWorker).toHaveBeenCalledWith(9, 101, 201);
    await expect(
      controller.assign({ user: { id: 101, role: 'client' } }, '9', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes completion photos only for a worker', async () => {
    const afterPhotos = [{ url: '/uploads/after.jpg' }];
    service.completeRequest.mockResolvedValue({ id: 9 });

    await expect(
      controller.complete({ user: { id: 201, role: 'worker' } }, '9', { afterPhotos }),
    ).resolves.toEqual({ id: 9 });
    expect(service.completeRequest).toHaveBeenCalledWith(9, 201, afterPhotos);
    await expect(
      controller.complete({ user: { id: 101, role: 'client' } }, '9', { afterPhotos }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes multipart before-image metadata with client ownership context', async () => {
    service.addUploadedFiles.mockResolvedValue({ id: 9 });
    const file = {
      originalname: 'before.png',
      mimetype: 'image/png',
      size: 68,
      buffer: Buffer.from('png'),
    };

    await expect(
      controller.uploadBefore({ user: { id: 101, role: 'client' } }, '9', [file]),
    ).resolves.toEqual({ id: 9 });
    expect(service.addUploadedFiles).toHaveBeenCalledWith(
      9,
      101,
      'client',
      'before',
      [file],
    );
  });
});

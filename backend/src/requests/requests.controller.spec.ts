import { BadRequestException } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { storeUploadedImage } from '../common/media-storage';

jest.mock('../common/media-storage', () => ({
  storeUploadedImage: jest.fn(),
  deleteStoredMedia: jest.fn(),
}));

describe('RequestsController v2 routes', () => {
  function setup() {
    (storeUploadedImage as jest.Mock).mockImplementation(
      async (
        buffer: Buffer,
        directorySegments: string[],
        publicDirectory: string,
        filenamePrefix: string,
      ) => ({
        url: `${publicDirectory}/${filenamePrefix}.webp`,
        thumbnailUrl: null,
        storageKey: `${directorySegments.join('/')}/${filenamePrefix}.webp`,
        thumbnailStorageKey: null,
        mimeType: 'image/webp',
        sizeBytes: buffer.length,
      }),
    );
    const service = {
      create: jest.fn(),
      addBeforeMedia: jest.fn(),
      addAfterMedia: jest.fn(),
      draftRequest: jest.fn(),
      getByClientUserId: jest.fn(),
      getHistoryByClientUserId: jest.fn(),
      getMapRequests: jest.fn(),
      getForWorkersFeed: jest.fn(),
      getCompletedForWorker: jest.fn(),
      applyToRequest: jest.fn(),
      withdrawApplication: jest.fn(),
      assignWorker: jest.fn(),
      unassignWorker: jest.fn(),
      workerConfirm: jest.fn(),
      markWorkerOnSite: jest.fn(),
      markInspected: jest.fn(),
      startWork: jest.fn(),
      finishWork: jest.fn(),
      readyForClientConfirmation: jest.fn(),
      clientConfirmWork: jest.fn(),
      completeRequest: jest.fn(),
    };

    return {
      service,
      controller: new RequestsController(service as any),
      clientRequest: { user: { id: 101, role: 'client' } },
      workerRequest: { user: { id: 201, role: 'worker' } },
    };
  }

  it('forwards the complete request lifecycle with canonical actor ids', async () => {
    const { controller, service, clientRequest, workerRequest } = setup();
    const afterPhotos = [{ url: '/uploads/after.jpg' }];

    await controller.apply(workerRequest, '55');
    await controller.withdraw(workerRequest, '55');
    await controller.assign(clientRequest, '55', { workerUserId: 201 });
    await controller.unassign(clientRequest, '55');
    await controller.workerConfirm(workerRequest, '55');
    await controller.onSite(workerRequest, '55');
    await controller.inspect(workerRequest, '55');
    await controller.startWork(workerRequest, '55');
    await controller.finishWork(workerRequest, '55', { afterPhotos });
    await controller.readyForClient(workerRequest, '55');
    await controller.clientConfirm(clientRequest, '55');

    expect(service.applyToRequest).toHaveBeenCalledWith(55, 201);
    expect(service.withdrawApplication).toHaveBeenCalledWith(55, 201);
    expect(service.assignWorker).toHaveBeenCalledWith(55, 101, 201);
    expect(service.unassignWorker).toHaveBeenCalledWith(55, 101);
    expect(service.workerConfirm).toHaveBeenCalledWith(55, 201);
    expect(service.markWorkerOnSite).toHaveBeenCalledWith(55, 201);
    expect(service.markInspected).toHaveBeenCalledWith(55, 201);
    expect(service.startWork).toHaveBeenCalledWith(55, 201);
    expect(service.finishWork).toHaveBeenCalledWith(55, 201, afterPhotos);
    expect(service.readyForClientConfirmation).toHaveBeenCalledWith(55, 201);
    expect(service.clientConfirmWork).toHaveBeenCalledWith(55, 101);
  });

  it('routes active and historical feeds to separate service methods', async () => {
    const { controller, service, clientRequest, workerRequest } = setup();

    await controller.myRequests(clientRequest, undefined);
    await controller.myRequests(clientRequest, 'history');
    await controller.workerFeed(workerRequest, undefined);
    await controller.workerFeed(workerRequest, 'history');

    expect(service.getByClientUserId).toHaveBeenCalledWith(101);
    expect(service.getHistoryByClientUserId).toHaveBeenCalledWith(101);
    expect(service.getForWorkersFeed).toHaveBeenCalledWith(201);
    expect(service.getCompletedForWorker).toHaveBeenCalledWith(201);
  });

  it('routes multipart request media with canonical actor ids', async () => {
    const { controller, service, clientRequest, workerRequest } = setup();
    const beforeFiles = [
      {
        buffer: Buffer.from('before'),
        mimetype: 'image/jpeg',
      },
    ];
    const afterFiles = [
      {
        buffer: Buffer.from('after'),
        mimetype: 'image/webp',
      },
    ];

    await controller.uploadBeforeMedia(
      clientRequest,
      '55',
      beforeFiles,
    );
    await controller.uploadAfterMedia(workerRequest, '55', afterFiles);

    expect(service.addBeforeMedia).toHaveBeenCalledWith(55, 101, [
      expect.objectContaining({
        url: '/uploads/requests/55/before/request_55_before.webp',
        storageKey: 'requests/55/before/request_55_before.webp',
        mimeType: 'image/webp',
        sizeBytes: 6,
      }),
    ]);
    expect(service.addAfterMedia).toHaveBeenCalledWith(55, 201, [
      expect.objectContaining({
        url: '/uploads/requests/55/after/request_55_after.webp',
        storageKey: 'requests/55/after/request_55_after.webp',
        mimeType: 'image/webp',
        sizeBytes: 5,
      }),
    ]);
  });

  it('rejects client-only routes for workers', async () => {
    const { controller, workerRequest } = setup();

    await expect(controller.create(workerRequest, {} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.assign(workerRequest, '55', { workerUserId: 201 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.clientConfirm(workerRequest, '55')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects worker-only routes for clients', async () => {
    const { controller, clientRequest } = setup();

    await expect(controller.apply(clientRequest, '55')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.workerConfirm(clientRequest, '55')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.startWork(clientRequest, '55')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment without a canonical worker user id', async () => {
    const { controller, clientRequest } = setup();

    await expect(controller.assign(clientRequest, '55', {})).rejects.toThrow('Missing workerUserId');
  });
});

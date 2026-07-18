import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RequestsService } from './requests.service';

function repo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
    ...overrides,
  };
}

describe('RequestsService v2 data core', () => {
  function serviceWith(overrides: Record<string, any> = {}) {
    return new RequestsService(
      (overrides.legacyRepo || repo()) as any,
      (overrides.repairRequestsRepo || repo()) as any,
      (overrides.applicationsRepo || repo()) as any,
      (overrides.pricingSnapshotsRepo || repo()) as any,
      (overrides.eventsRepo || repo({ save: jest.fn().mockResolvedValue({}) })) as any,
      (overrides.usersRepo || repo()) as any,
      (overrides.workerProfilesRepo || repo()) as any,
      {} as any,
      {} as any,
      (overrides.media || { createAsset: jest.fn(), findByRequest: jest.fn().mockResolvedValue([]) }) as any,
    );
  }

  it('creates new requests as pending admin approval', async () => {
    const savedRequests: any[] = [];
    const repairRequestsRepo = repo({
      save: jest.fn(async (request) => {
        const saved = { id: request.id || 1, createdAt: new Date(), updatedAt: new Date(), ...request };
        savedRequests.push(saved);
        return saved;
      }),
    });
    const pricingSnapshotsRepo = repo({
      save: jest.fn(async (snapshot) => ({ id: 501, ...snapshot })),
    });

    const service = serviceWith({ repairRequestsRepo, pricingSnapshotsRepo });
    const created = await service.create(
      {
        category: 'ВиК',
        description: 'Теч под мивката',
        address: 'София',
        photos: [],
      } as any,
      101,
    );

    expect(savedRequests[0].status).toBe('pending_admin');
    expect(created.statusKey).toBe('pending_admin');
  });

  it('rejects applications from suspended workers', async () => {
    const usersRepo = repo({
      findOne: jest.fn().mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'suspended',
        visibilityStatus: 'hidden',
      }),
    });

    const service = serviceWith({ usersRepo, workerProfilesRepo });

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks worker applications before admin approval', async () => {
    const usersRepo = repo({
      findOne: jest.fn().mockResolvedValue({ id: 201, role: 'worker', status: 'active' }),
    });
    const workerProfilesRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'visible',
      }),
    });
    const repairRequestsRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        status: 'pending_admin',
        assignedWorkerUserId: null,
      }),
    });

    const service = serviceWith({ usersRepo, workerProfilesRepo, repairRequestsRepo });

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(BadRequestException);
  });
});

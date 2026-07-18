import { ForbiddenException } from '@nestjs/common';
import { RequestsService } from './requests.service';

function repo(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
    ...overrides,
  };
}

describe('RequestsService v2 data core', () => {
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

    const service = new RequestsService(
      repo() as any,
      repo() as any,
      repo() as any,
      repo() as any,
      repo() as any,
      usersRepo as any,
      workerProfilesRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.applyToRequest(1, 201)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

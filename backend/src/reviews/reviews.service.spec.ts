import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService enforcement', () => {
  const reviewsRepo: any = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: 1, ...value })),
    find: jest.fn().mockResolvedValue([]),
  };
  const requestsRepo: any = { findOne: jest.fn() };
  const usersRepo: any = { findOne: jest.fn() };
  const service = new ReviewsService(reviewsRepo, requestsRepo, usersRepo);

  beforeEach(() => {
    jest.clearAllMocks();
    reviewsRepo.findOne.mockResolvedValue(null);
    usersRepo.findOne.mockImplementation(({ where }: any) => Promise.resolve({
      id: where.id,
      role: where.id === 101 ? 'client' : 'worker',
      accountStatus: 'active',
    }));
  });

  it('rejects reviews for an unapproved request', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 7, client: { id: 101 }, assignedWorkerId: 201,
      status: 'completed', completedAt: new Date(), moderationStatus: 'hidden',
    });

    await expect(service.createReview({ requestId: 7, rating: 5 } as any, 101))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reviews when the assigned worker is suspended', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 7, client: { id: 101 }, assignedWorkerId: 201,
      status: 'completed', completedAt: new Date(), moderationStatus: 'approved',
    });
    usersRepo.findOne.mockImplementation(({ where }: any) => Promise.resolve({
      id: where.id,
      role: where.id === 101 ? 'client' : 'worker',
      accountStatus: where.id === 201 ? 'suspended' : 'active',
    }));

    await expect(service.createReview({ requestId: 7, rating: 5 } as any, 101))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a pending review only for an approved completed request and active accounts', async () => {
    requestsRepo.findOne.mockResolvedValue({
      id: 7, client: { id: 101 }, assignedWorkerId: 201,
      status: 'completed', completedAt: new Date(), moderationStatus: 'approved',
    });

    const result = await service.createReview({ requestId: 7, rating: 5, comment: 'Done well' } as any, 101);

    expect(result).toEqual(expect.objectContaining({
      requestId: 7, workerUserId: 201, clientUserId: 101, moderationStatus: 'pending_review',
    }));
  });

  it('hides public reviews when the worker is suspended', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 201, role: 'worker', accountStatus: 'suspended' });

    await expect(service.getByWorker(201)).rejects.toBeInstanceOf(ForbiddenException);
    expect(reviewsRepo.find).not.toHaveBeenCalled();
  });
});

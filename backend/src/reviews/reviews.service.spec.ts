import { BadRequestException } from '@nestjs/common';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { RequestEventEntity } from '../requests/entities/request-event.entity';
import { RequestLifecycleService } from '../requests/request-lifecycle.service';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

describe('ReviewsService request lifecycle', () => {
  function setup(options: { existingReview?: any; request?: Record<string, any> } = {}) {
    const request: any = {
      id: 55,
      clientUserId: 101,
      assignedWorkerUserId: 201,
      status: 'client_confirmed',
      archivedAt: new Date('2026-07-19T10:00:00.000Z'),
      archiveReason: 'completed',
      ...options.request,
    };
    const manager = {
      findOne: jest.fn(async (entity) => {
        if (entity === RepairRequestEntity) return request;
        if (entity === ReviewEntity) return options.existingReview || null;
        return null;
      }),
      create: jest.fn((_entity, value) => ({ ...value })),
      save: jest.fn(async (value) =>
        Object.prototype.hasOwnProperty.call(value, 'rating')
          ? { id: 77, ...value }
          : value,
      ),
    };
    const reviewsRepo = {
      manager: {
        transaction: jest.fn(async (work) => work(manager)),
      },
      find: jest.fn(),
    };
    return {
      request,
      manager,
      reviewsRepo,
      service: new ReviewsService(
        reviewsRepo as any,
        new RequestLifecycleService(),
      ),
    };
  }

  it('atomically saves the review, advances the request and records an event', async () => {
    const { request, manager, reviewsRepo, service } = setup();

    const result = await service.createReview(
      { requestId: 55, rating: 5, comment: ' Отлична работа ' },
      101,
    );

    expect(reviewsRepo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: 77,
        requestId: 55,
        clientUserId: 101,
        workerUserId: 201,
        rating: 5,
        comment: 'Отлична работа',
      }),
    );
    expect(request.status).toBe('reviewed');
    expect(manager.save).toHaveBeenCalledWith(request);
    expect(manager.create).toHaveBeenCalledWith(
      RequestEventEntity,
      expect.objectContaining({
        requestId: 55,
        actorUserId: 101,
        eventType: 'request.reviewed',
        metadataJson: { reviewId: 77, rating: 5 },
      }),
    );
  });

  it('rejects a second review without changing the request status', async () => {
    const { request, manager, service } = setup({
      existingReview: { id: 10, requestId: 55, clientUserId: 101 },
    });

    await expect(
      service.createReview({ requestId: 55, rating: 4 }, 101),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(request.status).toBe('client_confirmed');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not reopen a request after the worker already closed it', async () => {
    const { request, manager, service } = setup({
      request: {
        status: 'completed',
        archiveReason: 'closed_by_worker',
      },
    });

    await expect(
      service.createReview({ requestId: 55, rating: 5 }, 101),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(request.status).toBe('completed');
    expect(manager.save).not.toHaveBeenCalled();
  });
});

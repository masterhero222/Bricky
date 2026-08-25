import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { RequestEventEntity } from '../requests/entities/request-event.entity';
import { REQUEST_LIFECYCLE_ACTIONS } from '../requests/request-lifecycle';
import { RequestLifecycleService } from '../requests/request-lifecycle.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepo: Repository<ReviewEntity>,
    private readonly lifecycle: RequestLifecycleService,
  ) {}

  async createReview(dto: CreateReviewDto, clientUserId: number) {
    const requestId = Number(dto?.requestId);
    const rating = Number(dto?.rating);

    if (!requestId) throw new BadRequestException('Missing requestId');
    if (!clientUserId) throw new BadRequestException('Missing client');
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const saved = await this.reviewsRepo.manager.transaction(async (manager) => {
      const req = await manager.findOne(RepairRequestEntity, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!req) throw new NotFoundException('Request not found');
      if (Number(req.clientUserId) !== Number(clientUserId)) {
        throw new ForbiddenException('Not your request');
      }
      if (req.status === 'completed' && req.archiveReason === 'closed_by_worker') {
        throw new BadRequestException('Request is already closed');
      }
      if (!['client_confirmed', 'completed'].includes(req.status) || !req.archivedAt) {
        throw new BadRequestException('Request must be completed before review');
      }
      if (req.status === 'client_confirmed') {
        this.lifecycle.assertTransition(
          req.status,
          REQUEST_LIFECYCLE_ACTIONS.LEAVE_REVIEW,
        );
      }

      const workerUserId = Number(req.assignedWorkerUserId || 0);
      if (!workerUserId) throw new BadRequestException('No assigned worker');

      const existing = await manager.findOne(ReviewEntity, {
        where: { requestId, clientUserId },
      });
      if (existing) throw new BadRequestException('Review already exists');

      const review = manager.create(ReviewEntity, {
        requestId,
        workerUserId,
        clientUserId,
        rating,
        comment: dto.comment?.trim() ? dto.comment.trim() : null,
      });
      const savedReview = await manager.save(review);

      req.status = 'reviewed';
      await manager.save(req);

      const event = manager.create(RequestEventEntity, {
        requestId,
        actorUserId: clientUserId,
        eventType: 'request.reviewed',
        metadataJson: { reviewId: savedReview.id, rating },
      });
      await manager.save(event);

      return savedReview;
    });

    return saved;
  }

  async getByClient(clientUserId: number) {
    const cid = Number(clientUserId);
    if (!cid) throw new BadRequestException('Invalid clientUserId');

    return this.reviewsRepo.find({
      where: { clientUserId: cid },
      order: { created_at: 'DESC' },
    });
  }

  async getByWorker(workerUserId: number) {
    const wid = Number(workerUserId);
    if (!wid) throw new BadRequestException('Invalid workerUserId');

    const rows = await this.reviewsRepo.find({
      where: { workerUserId: wid },
      order: { created_at: 'DESC' },
    });

    const items = rows
      .filter((review) => !['rejected', 'hidden'].includes(String(review.moderationStatus || '')))
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
      }));

    const total = items.length;
    const average =
      total === 0
        ? 0
        : Math.round((items.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total) * 10) / 10;

    return { total, average, items };
  }
}

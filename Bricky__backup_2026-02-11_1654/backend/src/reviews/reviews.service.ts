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
import { RequestEntity } from '../requests/entities/request.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepo: Repository<ReviewEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestsRepo: Repository<RequestEntity>,
  ) {}

  async createReview(dto: CreateReviewDto, clientUserId: number) {
    const requestId = Number(dto?.requestId);
    const rating = Number(dto?.rating);

    if (!requestId) throw new BadRequestException('Missing requestId');
    if (!clientUserId) throw new BadRequestException('Missing client');
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const req = await this.requestsRepo.findOne({
      where: { id: requestId },
      relations: ['client'],
    });
    if (!req) throw new NotFoundException('Request not found');

    // only owner client can rate
    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    // only after completion
    if (req.status !== 'завършена') {
      throw new BadRequestException('Request must be completed before review');
    }

    const workerUserId = Number(req.assignedWorkerId || 0);
    if (!workerUserId) throw new BadRequestException('No assigned worker');

    const existing = await this.reviewsRepo.findOne({
      where: { requestId, clientUserId },
    });
    if (existing) throw new BadRequestException('Review already exists');

    const review = this.reviewsRepo.create({
      requestId,
      workerUserId,
      clientUserId,
      rating,
      comment: dto.comment?.trim() ? dto.comment.trim() : null,
    });

    return this.reviewsRepo.save(review);
  }

  // ✅ for frontend: know which requests are rated by this client
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

    const items = await this.reviewsRepo.find({
      where: { workerUserId: wid },
      order: { created_at: 'DESC' },
    });

    const total = items.length;
    const avg =
      total === 0
        ? 0
        : Math.round((items.reduce((s, r) => s + Number(r.rating || 0), 0) / total) * 10) / 10;

    return { total, average: avg, items };
  }
}

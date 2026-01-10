import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

function normalizeNumberArray(arr: any): number[] {
  const a = Array.isArray(arr) ? arr : [];
  const out = a.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(out));
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly repo: Repository<RequestEntity>,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateRequestDto, clientUserId: number) {
    if (!clientUserId) throw new UnauthorizedException('Not logged in');

    const request = this.repo.create({
      client: { id: clientUserId } as any,
      clientName: dto.clientName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      category: dto.category,
      description: dto.description,
      status: 'нова',
      appliedWorkers: [],
      assignedWorkerId: null,
      completedAt: null,
      completedByWorkerId: null,
    });

    const saved = await this.repo.save(request);

    // без имейл засега (ти така искаш)
    // this.mailService.sendRequestConfirmation(...).catch(() => null);

    return saved;
  }

  async getByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    return this.repo.find({
      where: { client: { id: clientUserId } },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Worker feed:
   * - свободни (assignedWorkerId IS NULL) + незатворени
   * - плюс assigned на ТОЗИ worker + незатворени
   */
  async getForWorkersFeed(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');

    return this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .where(
        new Brackets((qb) => {
          qb.where('r.assignedWorkerId IS NULL')
            .andWhere('r.status != :done', { done: 'завършена' })
            .andWhere('r.status != :canceled', { canceled: 'отказана' });
        }),
      )
      .orWhere(
        new Brackets((qb) => {
          qb.where('r.assignedWorkerId = :wid', { wid: workerUserId })
            .andWhere('r.status != :done', { done: 'завършена' })
            .andWhere('r.status != :canceled', { canceled: 'отказана' });
        }),
      )
      .orderBy('r.created_at', 'DESC')
      .getMany();
  }

  async getCompletedForWorker(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');
    return this.repo.find({
      where: { assignedWorkerId: workerUserId, status: 'завършена' },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  async applyToRequest(requestId: number, workerUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (req.assignedWorkerId) throw new BadRequestException('Request already has assigned worker');
    if (req.status === 'завършена' || req.status === 'отказана') throw new BadRequestException('Request is closed');

    const applied = normalizeNumberArray(req.appliedWorkers);

    if (!applied.includes(workerUserId)) {
      applied.push(workerUserId);
      req.appliedWorkers = applied;
    }

    if ((req.status || '').toLowerCase() === 'нова') req.status = 'кандидатствана';

    return this.repo.save(req);
  }

  async assignWorker(requestId: number, clientUserId: number, workerUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    if (req.status === 'завършена' || req.status === 'отказана') {
      throw new BadRequestException('Request is closed');
    }

    const applied = normalizeNumberArray(req.appliedWorkers);
    if (!applied.includes(workerUserId)) {
      throw new BadRequestException('This worker has not applied to this request');
    }

    req.assignedWorkerId = workerUserId;
    req.status = 'в процес';
    req.completedAt = null;
    req.completedByWorkerId = null;

    // без имейл, може нотификация по желание
    // await this.notifications.notifyWorkerAssigned(workerUserId, req.id).catch(() => null);

    return this.repo.save(req);
  }

  async unassignWorker(requestId: number, clientUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    if (req.status === 'завършена') throw new BadRequestException('Already completed');

    req.assignedWorkerId = null;

    const applied = normalizeNumberArray(req.appliedWorkers);
    req.status = applied.length > 0 ? 'кандидатствана' : 'нова';

    return this.repo.save(req);
  }

  // ✅ WORKER: complete request
  async completeRequest(requestId: number, workerUserId: number) {
    if (!requestId) throw new BadRequestException('Missing request id');
    if (!workerUserId) throw new BadRequestException('Missing worker id');

    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.assignedWorkerId) !== Number(workerUserId)) {
      throw new ForbiddenException('Not your job');
    }

    if (req.status === 'завършена') return req;
    if (req.status === 'отказана') throw new BadRequestException('Request canceled');

    req.status = 'завършена';
    req.completedAt = new Date();
    req.completedByWorkerId = workerUserId;

    return this.repo.save(req);
  }
}

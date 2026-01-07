import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailService } from '../mail/mail.service';

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
    });

    const saved = await this.repo.save(request);

    this.mailService
      .sendRequestConfirmation({ email: saved.email, clientName: saved.clientName })
      .catch(() => null);

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

  async getForWorkersFeed() {
    return this.repo.find({
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  async applyToRequest(requestId: number, workerUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (req.assignedWorkerId) {
      throw new BadRequestException('Request already has assigned worker');
    }

    const applied = normalizeNumberArray(req.appliedWorkers);

    if (!applied.includes(workerUserId)) {
      applied.push(workerUserId);
      req.appliedWorkers = applied;
    }

    if ((req.status || '').toLowerCase() === 'нова') {
      req.status = 'кандидатствана';
    }

    return this.repo.save(req);
  }

  async assignWorker(requestId: number, clientUserId: number, workerUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    const applied = normalizeNumberArray(req.appliedWorkers);
    if (!applied.includes(workerUserId)) {
      throw new BadRequestException('This worker has not applied to this request');
    }

    req.assignedWorkerId = workerUserId;
    req.status = 'в процес'; // или 'назначена' ако предпочиташ

    return this.repo.save(req);
  }

  async unassignWorker(requestId: number, clientUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    req.assignedWorkerId = null;

    const applied = normalizeNumberArray(req.appliedWorkers);
    req.status = applied.length > 0 ? 'кандидатствана' : 'нова';

    return this.repo.save(req);
  }
}

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestsRepository: Repository<RequestEntity>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateRequestDto, clientId: number) {
    if (!clientId) throw new UnauthorizedException('Not logged in');

    const request = this.requestsRepository.create({
      client: { id: clientId } as any,
      clientName: dto.clientName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      category: dto.category,
      description: dto.description,
      status: 'нова',
    });

    const saved = await this.requestsRepository.save(request);

    this.mailService
      .sendRequestConfirmation({
        email: saved.email,
        clientName: saved.clientName,
      })
      .catch(() => null);

    return saved;
  }

  async findAllForClient(userId: number) {
    if (!userId) throw new BadRequestException('Missing userId');

    return this.requestsRepository.find({
      where: { client: { id: userId } },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  async findAllForWorker() {
    // на този етап: майсторите виждат всички
    return this.requestsRepository.find({
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    return this.requestsRepository.findOne({
      where: { id },
      relations: ['client'],
    });
  }

  async remove(id: number) {
    return this.requestsRepository.delete(id);
  }

  // MVP логика (apply/assign) - оставям ти я, за да продължим “секси логиката”
  async applyForRequest(requestId: number, workerId: number) {
    const req = await this.requestsRepository.findOne({ where: { id: requestId } });
    if (!req) throw new BadRequestException('Заявката не съществува');

    const arr = req.appliedWorkers ?? [];
    if (!arr.includes(workerId)) arr.push(workerId);

    req.appliedWorkers = arr;
    req.status = 'кандидатствана';

    return this.requestsRepository.save(req);
  }

  async assignWorker(requestId: number, workerId: number) {
    const req = await this.requestsRepository.findOne({ where: { id: requestId } });
    if (!req) throw new BadRequestException('Заявката не съществува');

    req.assignedWorkerId = workerId;
    req.status = 'в процес';

    return this.requestsRepository.save(req);
  }

  async findAllForClientByEmail(email: string) {
  return this.requestsRepository.find({
    where: { email },
    order: { created_at: 'DESC' },
  });
}

}

import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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

  // CREATE – само за логнати
  async create(dto: CreateRequestDto, clientId?: number) {
    if (!clientId) {
      throw new UnauthorizedException(
        'Трябва да си логнат, за да създадеш заявка'
      );
    }

    const request = this.requestsRepository.create({
      client: { id: clientId } as any,  // FIXED
      clientName: dto.clientName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      category: dto.category,
      description: dto.description,
      status: 'нова',
    });

    const saved = await this.requestsRepository.save(request);

    // Fire-and-forget
    this.mailService
      .sendRequestConfirmation({
        email: saved.email,
        clientName: saved.clientName,
      })
      .catch((err) =>
        console.error('Mail error (non-fatal):', err?.message ?? err),
      );

    return saved;
  }

  async findAll() {
    return this.requestsRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    return this.requestsRepository.findOne({ where: { id } });
  }

  async deleteRequest(id: number) {
    return this.requestsRepository.delete(id);
  }

  remove(id: number) {
    return this.deleteRequest(id);
  }
}

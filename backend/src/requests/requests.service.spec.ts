import { Injectable } from '@nestjs/common';
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

  // CREATE (MVP)
  async createRequest(data: CreateRequestDto) {
    const request = this.requestsRepository.create({
      clientName: data.clientName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      category: data.category,
      description: data.description,
      status: 'нова',
    });

    const saved = await this.requestsRepository.save(request);

    // ⬇️ тук вече пращаме имейл
    await this.mailService.sendRequestConfirmation(saved);

    return saved;
  }

  async findAll() {
    return await this.requestsRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    return await this.requestsRepository.findOne({ where: { id } });
  }

  async deleteRequest(id: number) {
    return await this.requestsRepository.delete(id);
  }

  remove(id: number) {
    return this.deleteRequest(id);
  }

  create(dto: CreateRequestDto) {
    return this.createRequest(dto);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestsRepository: Repository<RequestEntity>,
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

    return await this.requestsRepository.save(request);
  }

  // GET ALL
  async findAll() {
    return await this.requestsRepository.find({
      order: { id: 'DESC' },
    });
  }

  // GET ONE (MVP placeholder)
  async findOne(id: number) {
    return await this.requestsRepository.findOne({ where: { id } });
  }

  // DELETE
  async deleteRequest(id: number) {
    return await this.requestsRepository.delete(id);
  }

  // REMOVE (Nest placeholder)
  remove(id: number) {
    return this.deleteRequest(id);
  }

  // CREATE (Nest placeholder)
  create(dto: CreateRequestDto) {
    return this.createRequest(dto);
  }
}

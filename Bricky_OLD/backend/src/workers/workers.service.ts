import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
  ) {}

  async create(createWorkerDto: CreateWorkerDto) {
    const existing = await this.workerRepository.findOne({
      where: { email: createWorkerDto.email },
    });

    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(createWorkerDto.password, 10);

    const worker = this.workerRepository.create({
      ...createWorkerDto,
      password: hashedPassword,
      isApproved: false,
    });

    await this.workerRepository.save(worker);
    return { message: 'Worker registered successfully', data: worker };
  }

  async findAll() {
    return await this.workerRepository.find();
  }
}

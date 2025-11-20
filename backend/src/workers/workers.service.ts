// src/workers/workers.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
  ) {}

  // REGISTER WORKER
  async create(dto: CreateWorkerDto) {
    const email = dto.email.trim().toLowerCase();

    // Check if email exists
    const exists = await this.workerRepository.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Този имейл вече е регистриран.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create worker
    const worker = this.workerRepository.create({
      fullName: dto.fullName,
      email,
      password: hashedPassword,
      phone: dto.phone,
      city: dto.city,
      skills: dto.skills,
      isApproved: false,
    });

    const saved = await this.workerRepository.save(worker);
    this.logger.log(`Нов майстор: ${saved.fullName} (${saved.email})`);

    // Remove password before returning
    const { password, ...safe } = saved;
    return { message: 'Worker registered successfully', data: safe };
  }

  // GET ALL WORKERS
  async findAll() {
    const rows = await this.workerRepository.find();
    return rows.map(({ password, ...rest }) => rest);
  }

  // GET ONE WORKER
  async findOne(id: number) {
    const row = await this.workerRepository.findOne({ where: { id } });
    if (!row) return null;

    const { password, ...safe } = row;
    return safe;
  }

  // DELETE WORKER
  async deleteWorker(id: number) {
    return this.workerRepository.delete(id);
  }
}

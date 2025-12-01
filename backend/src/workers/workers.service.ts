// src/workers/workers.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './worker.entity';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateWorkerDto } from './dto/create-worker.dto';

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    private readonly users: UsersService,
  ) {}

  async findByEmail(email: string) {
  return this.workerRepository.findOne({ where: { email } });
}


  async create(dto: CreateWorkerDto) {
    const email = dto.email.toLowerCase();

    // Проверка дали вече има такъв майстор
    const exists = await this.workerRepository.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Този имейл вече е регистриран като майстор.');
    }

    // Хеш на паролата
    const hashed = await bcrypt.hash(dto.password, 10);

    // 1) Създаваме запис в users (за login системата)
    const user = await this.users.create({
      name: dto.fullName,
      email: email,
      password: hashed,
      role: 'worker',
    });

    // 2) Създаваме worker профила
    const worker = this.workerRepository.create({
      fullName: dto.fullName,
      email,
      password: hashed, // ВАЖНО: същия хеш, за да може да логва и от тук при нужда
      phone: dto.phone,
      city: dto.city,
      skills: Array.isArray(dto.skills) ? dto.skills.join(', ') : dto.skills,
      isApproved: false,
      userId: user.id,
    });

    const saved = await this.workerRepository.save(worker);

    this.logger.log(`Нов майстор: ${saved.fullName} (${saved.email})`);

    return {
      message: 'Worker registered successfully',
      data: saved,
    };
  }

  async findAll() {
    return this.workerRepository.find();
  }
}

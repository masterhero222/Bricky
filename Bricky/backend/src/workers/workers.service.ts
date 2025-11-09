// src/workers/workers.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import * as bcrypt from 'bcryptjs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    private readonly mailer: MailerService,
  ) {}

  async create(dto: CreateWorkerDto) {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.workerRepository.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Този имейл вече е регистриран.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

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
    this.logger.log(`✅ Нов майстор: ${saved.fullName} (${saved.email})`);

    // (по желание) имейлите ти остават както ги настроихме с шаблони…

    const { password, ...safe } = saved;
    return { message: 'Worker registered successfully', data: safe };
  }

  async findAll() {
    const rows = await this.workerRepository.find();
    return rows.map(({ password, ...rest }) => rest);
  }
}

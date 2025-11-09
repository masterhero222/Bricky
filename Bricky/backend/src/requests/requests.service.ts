// src/requests/requests.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepo: Repository<Request>,
    private readonly mailer: MailerService,
  ) {}

  async create(dto: CreateRequestDto) {
    const entity = this.requestRepo.create(dto);
    const saved = await this.requestRepo.save(entity);

    // към клиента (шаблон)
    await this.mailer.sendMail({
      to: dto.email,
      subject: 'Благодарим за заявката в Bricky!',
      template: 'request-confirmation',   // request-confirmation.hbs
      context: {
        clientName: dto.clientName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address || '—',
        category: dto.category || '—',
        description: dto.description || '—',
      },
    });

    // към админ (по желание – можеш да оставиш ако искаш)
    const adminTo = process.env.MAIL_TO_ADMIN || process.env.MAIL_USER;
    await this.mailer.sendMail({
      to: adminTo,
      subject: '🧱 Bricky: Нова клиентска заявка',
      template: 'request-confirmation',
      context: {
        clientName: dto.clientName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address || '—',
        category: dto.category || '—',
        description: dto.description || '—',
      },
    });

    return { message: 'Заявката е записана успешно', data: saved };
  }

  findAll() {
    return this.requestRepo.find({ order: { created_at: 'DESC' } });
  }

  findOne(id: number) {
    return this.requestRepo.findOne({ where: { id } });
  }

  async remove(id: number) {
    await this.requestRepo.delete(id);
    return { message: `Заявка #${id} е изтрита.` };
  }
}

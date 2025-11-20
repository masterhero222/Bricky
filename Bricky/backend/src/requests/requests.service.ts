import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailerService } from '@nestjs-modules/mailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    private readonly mailerService: MailerService,
  ) {}

  // 🧱 Създаване на нова заявка
  async create(createRequestDto: CreateRequestDto) {
    const newRequest = this.requestRepository.create(createRequestDto);
    await this.requestRepository.save(newRequest);

    // 🧱 Рендерираме HTML шаблон с реалните стойности
    const html = await this.renderTemplate('email-template.html', {
      clientName: createRequestDto.clientName,
      email: createRequestDto.email,
      phone: createRequestDto.phone,
      address: createRequestDto.address,
      category: createRequestDto.category,
      description: createRequestDto.description,
    });

    // 🧱 Изпращаме имейл
    await this.mailerService.sendMail({
      to: 'tsvetoslavpaskalev@gmail.com', // 📬 Твоят основен имейл за известия
      subject: '🧱 Нова заявка в Bricky',
      html,
    });

    return {
      message: '✅ Заявката е записана и имейлът е изпратен успешно!',
      data: newRequest,
    };
  }

  // 🧱 Извличане на всички заявки
  async findAll() {
    return await this.requestRepository.find();
  }

  // 🧱 Извличане на една заявка по ID
  async findOne(id: number) {
    return await this.requestRepository.findOneBy({ id });
  }

  // 🧱 Изтриване на заявка
  async remove(id: number) {
    await this.requestRepository.delete(id);
    return { message: `🗑️ Заявка с ID ${id} беше изтрита.` };
  }

  // 🧱 Зареждане и рендиране на HTML шаблон
  private async renderTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<string> {
    const filePath = path.join(process.cwd(), 'src', 'mail', 'templates', templateName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`❌ Шаблонът ${templateName} не е намерен в mail/templates`);
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // Заместваме {{placeholders}} с реалните стойности
    for (const key in data) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key] ?? '');
    }

    return html;
  }
}

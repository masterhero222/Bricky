import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendRequestConfirmation(request: { email: string; clientName?: string }) {
    if (!request?.email) {
      this.logger.warn('❗ Прескачам имейл – липсва email в заявката');
      return;
    }

    try {
      await this.mailer.sendMail({
        to: request.email,
        subject: 'Приета заявка – Bricky',
        template: 'request-confirmation',
        context: {
          name: request.clientName || 'клиент',
        },
      });

      this.logger.log(`📧 Изпратено писмо до ${request.email}`);
    } catch (error) {
      this.logger.error(
        `Грешка при изпращане на имейл до ${request.email}: ${error.message}`,
        error.stack,
      );
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailDeliveryStatus } from '../account-security/email-delivery-log.entity';

export type AccountMailSendResult = {
  status: EmailDeliveryStatus;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendRequestConfirmation(request: { email: string; clientName?: string }) {
    if (!request?.email) {
      this.logger.warn('Прескачам имейл: липсва email в заявката');
      return;
    }

    try {
      await this.mailer.sendMail({
        to: request.email,
        subject: 'Приета заявка - Bricky',
        template: 'request-confirmation',
        context: {
          name: request.clientName || 'клиент',
        },
      });

      this.logger.log(`Изпратено писмо до ${request.email}`);
    } catch (error) {
      this.logger.error(
        `Грешка при изпращане на имейл до ${request.email}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
    }
  }

  async sendEmailVerification(payload: { email: string; name?: string; token: string }) {
    const verificationUrl = this.buildFrontendUrl(
      `/auth/verify-email?token=${encodeURIComponent(payload.token)}`,
    );
    const greeting = this.greeting(payload.name);

    return this.sendAccountMail({
      to: payload.email,
      subject: 'Потвърди имейла си в Bricky',
      text: `${greeting}\n\nПотвърди имейла си от този линк:\n${verificationUrl}\n\nАко не си създавал акаунт в Bricky, игнорирай това съобщение.`,
      html: `<p>${greeting}</p><p>Потвърди имейла си от този линк:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>Ако не си създавал акаунт в Bricky, игнорирай това съобщение.</p>`,
      type: 'email_verification',
    });
  }

  async sendPasswordReset(payload: { email: string; name?: string; token: string }) {
    const resetUrl = this.buildFrontendUrl(`/auth/reset-password?token=${encodeURIComponent(payload.token)}`);
    const greeting = this.greeting(payload.name);

    return this.sendAccountMail({
      to: payload.email,
      subject: 'Смяна на парола в Bricky',
      text: `${greeting}\n\nСмени паролата си от този линк:\n${resetUrl}\n\nАко не си поискал смяна на парола, игнорирай това съобщение.`,
      html: `<p>${greeting}</p><p>Смени паролата си от този линк:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ако не си поискал смяна на парола, игнорирай това съобщение.</p>`,
      type: 'password_reset',
    });
  }

  async sendPasswordChanged(payload: { email: string; name?: string }) {
    const greeting = this.greeting(payload.name);

    return this.sendAccountMail({
      to: payload.email,
      subject: 'Паролата ти в Bricky беше сменена',
      text: `${greeting}\n\nПаролата ти в Bricky беше сменена успешно. Ако това не си бил ти, свържи се с поддръжката веднага.`,
      html: `<p>${greeting}</p><p>Паролата ти в Bricky беше сменена успешно.</p><p>Ако това не си бил ти, свържи се с поддръжката веднага.</p>`,
      type: 'password_changed',
    });
  }

  private greeting(name?: string) {
    return `Здравей${name ? `, ${name}` : ''}!`;
  }

  private buildFrontendUrl(path: string) {
    const base = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'https://bricky.bg';
    return `${base.replace(/\/$/, '')}${path}`;
  }

  private async sendAccountMail(payload: {
    to: string;
    subject: string;
    text: string;
    html: string;
    type: string;
  }): Promise<AccountMailSendResult> {
    if (!payload.to) {
      this.logger.warn(`Skipping ${payload.type} email: missing recipient`);
      return { status: 'skipped', errorCode: 'missing_recipient', errorMessage: 'Missing recipient email' };
    }

    try {
      const response = await this.mailer.sendMail({
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      this.logger.log(`Sent ${payload.type} email to ${payload.to}`);
      return {
        status: 'sent',
        providerMessageId: this.getMessageId(response),
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to send ${payload.type} email to ${payload.to}: ${errorMessage}`, this.getErrorStack(error));
      return {
        status: 'failed',
        errorCode: this.getErrorCode(error),
        errorMessage,
      };
    }
  }

  private getMessageId(response: unknown) {
    if (response && typeof response === 'object' && 'messageId' in response) {
      const messageId = (response as { messageId?: unknown }).messageId;
      return typeof messageId === 'string' ? messageId : null;
    }
    return null;
  }

  private getErrorCode(error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : null;
    }
    return null;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown mail provider error';
  }

  private getErrorStack(error: unknown) {
    return error instanceof Error ? error.stack : undefined;
  }
}

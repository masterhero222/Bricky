import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly confirmationTemplate: Handlebars.TemplateDelegate;
  private readonly passwordResetTemplate: Handlebars.TemplateDelegate;
  private readonly emailVerificationTemplate: Handlebars.TemplateDelegate;

  constructor(config: ConfigService) {
    const port = config.get<number>('MAIL_PORT') || 587;
    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host: config.get<string>('MAIL_HOST'),
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    this.from =
      config.get<string>('MAIL_FROM') || 'Bricky <no-reply@bricky.bg>';
    this.confirmationTemplate = Handlebars.compile(
      readFileSync(
        join(__dirname, 'templates', 'request-confirmation.hbs'),
        'utf8',
      ),
      { strict: true },
    );
    this.passwordResetTemplate = Handlebars.compile(
      readFileSync(join(__dirname, 'templates', 'password-reset.hbs'), 'utf8'),
      { strict: true },
    );
    this.emailVerificationTemplate = Handlebars.compile(
      readFileSync(
        join(__dirname, 'templates', 'email-verification.hbs'),
        'utf8',
      ),
      { strict: true },
    );
  }

  async sendRequestConfirmation(request: {
    email: string;
    clientName?: string;
  }) {
    if (!request?.email) {
      this.logger.warn(
        'Skipping email because the request has no email address',
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: request.email,
        subject: 'Приета заявка – Bricky',
        html: this.confirmationTemplate({
          name: request.clientName || 'клиент',
        }),
      });

      this.logger.log(`Confirmation email sent to ${request.email}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const details =
        error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(
        `Грешка при изпращане на имейл до ${request.email}: ${message}`,
        details,
      );
    }
  }

  async sendPasswordResetLink(request: {
    email: string;
    name: string;
    resetUrl: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: request.email,
        subject: 'Защитен линк за смяна на паролата - Bricky',
        html: this.passwordResetTemplate({
          name: request.name || 'потребител',
          resetUrl: request.resetUrl,
        }),
      });
      this.logger.log(`Password reset email sent to ${request.email}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Password reset email failed for ${request.email}: ${message}`,
      );
      return false;
    }
  }

  async sendEmailVerificationLink(request: {
    email: string;
    name: string;
    verificationUrl: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: request.email,
        subject: 'Потвърдете имейла си - Bricky',
        html: this.emailVerificationTemplate({
          name: request.name || 'потребител',
          verificationUrl: request.verificationUrl,
        }),
      });
      this.logger.log(`Email verification sent to ${request.email}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Email verification failed for ${request.email}: ${message}`,
      );
      return false;
    }
  }
}

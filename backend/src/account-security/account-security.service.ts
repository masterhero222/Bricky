import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AccountTokenEntity, AccountTokenType } from './account-token.entity';
import { EmailDeliveryLogEntity, EmailDeliveryStatus } from './email-delivery-log.entity';

@Injectable()
export class AccountSecurityService {
  constructor(
    @InjectRepository(AccountTokenEntity)
    private readonly tokens: Repository<AccountTokenEntity>,
    @InjectRepository(EmailDeliveryLogEntity)
    private readonly deliveryLogs: Repository<EmailDeliveryLogEntity>,
  ) {}

  createRawToken() {
    return randomBytes(32).toString('base64url');
  }

  hashToken(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async issueToken(
    userId: number,
    type: AccountTokenType,
    ttlMinutes: number,
    metadata?: { ip?: string | null; userAgent?: string | null },
  ) {
    const rawToken = this.createRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const row = this.tokens.create({
      userId,
      type,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdIp: metadata?.ip ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    await this.tokens.save(row);
    return { rawToken, token: row };
  }

  async consumeToken(rawToken: string, type: AccountTokenType) {
    if (!rawToken || rawToken.length < 20) {
      throw new BadRequestException('Невалиден или изтекъл токен');
    }

    const tokenHash = this.hashToken(rawToken);
    const row = await this.tokens.findOne({
      where: {
        tokenHash,
        type,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!row || !this.safeEquals(row.tokenHash, tokenHash)) {
      throw new BadRequestException('Невалиден или изтекъл токен');
    }

    row.usedAt = new Date();
    await this.tokens.save(row);
    return row;
  }

  async logEmailDelivery(payload: {
    userId?: number | null;
    email: string;
    type: string;
    provider?: string | null;
    status: EmailDeliveryStatus;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    attemptCount?: number;
  }) {
    const email = payload.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Missing email');

    const row = this.deliveryLogs.create({
      userId: payload.userId ?? null,
      email,
      type: payload.type,
      provider: payload.provider ?? null,
      status: payload.status,
      providerMessageId: payload.providerMessageId ?? null,
      errorCode: payload.errorCode ?? null,
      errorMessage: payload.errorMessage ?? null,
      attemptCount: payload.attemptCount ?? 1,
      lastAttemptAt: new Date(),
    });

    return this.deliveryLogs.save(row);
  }

  private safeEquals(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}

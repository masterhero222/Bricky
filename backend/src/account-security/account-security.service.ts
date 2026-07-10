import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { AccountTokenEntity, AccountTokenType } from './account-token.entity';
import { EmailDeliveryLogEntity, EmailDeliveryStatus } from './email-delivery-log.entity';

export type AccountSecurityCleanupOptions = {
  tokenRetentionDays?: number;
  emailLogRetentionDays?: number;
};

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
    return this.issueTokenWithRawToken(userId, type, this.createRawToken(), ttlMinutes, metadata);
  }

  async issueTokenWithRawToken(
    userId: number,
    type: AccountTokenType,
    rawToken: string,
    ttlMinutes: number,
    metadata?: { ip?: string | null; userAgent?: string | null },
  ) {
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

  async assertTokenIssueAllowed(
    userId: number,
    type: AccountTokenType,
    options: { maxAttempts: number; windowMinutes: number },
  ) {
    const since = new Date(Date.now() - options.windowMinutes * 60 * 1000);
    const recentCount = await this.tokens.count({
      where: {
        userId,
        type,
        createdAt: MoreThan(since),
      },
    });

    if (recentCount >= options.maxAttempts) {
      throw new HttpException(
        `Твърде много заявки. Опитай отново след ${options.windowMinutes} минути.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
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

  async consumeTokenForUser(userId: number, rawToken: string, type: AccountTokenType) {
    if (!rawToken || rawToken.length < 6) {
      throw new BadRequestException('Невалиден или изтекъл код');
    }

    const tokenHash = this.hashToken(rawToken);
    const row = await this.tokens.findOne({
      where: {
        userId,
        tokenHash,
        type,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!row || !this.safeEquals(row.tokenHash, tokenHash)) {
      throw new BadRequestException('Невалиден или изтекъл код');
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

  async cleanupExpiredSecurityData(options?: AccountSecurityCleanupOptions) {
    const tokenRetentionDays = options?.tokenRetentionDays ?? 30;
    const emailLogRetentionDays = options?.emailLogRetentionDays ?? 180;
    const now = Date.now();
    const tokenCutoff = new Date(now - tokenRetentionDays * 24 * 60 * 60 * 1000);
    const emailLogCutoff = new Date(now - emailLogRetentionDays * 24 * 60 * 60 * 1000);

    const expiredTokens = await this.tokens.delete({
      expiresAt: LessThan(tokenCutoff),
    });
    const usedTokens = await this.tokens.delete({
      usedAt: LessThan(tokenCutoff),
    });
    const emailLogs = await this.deliveryLogs.delete({
      createdAt: LessThan(emailLogCutoff),
    });

    return {
      tokenRetentionDays,
      emailLogRetentionDays,
      tokenCutoff,
      emailLogCutoff,
      expiredTokens: expiredTokens.affected ?? 0,
      usedTokens: usedTokens.affected ?? 0,
      emailLogs: emailLogs.affected ?? 0,
    };
  }

  private safeEquals(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}

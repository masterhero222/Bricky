import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'node:crypto';
import { EntityManager, In, Repository } from 'typeorm';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';
import { NotificationEntity } from '../notifications/notification.entity';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { CreatePrivacyRequestDto, UpdatePrivacyPreferencesDto, UpdatePrivacyRequestDto } from './dto/privacy.dto';
import { DataSubjectRequestEntity } from './data-subject-request.entity';
import { PRIVACY_VERSION, TERMS_VERSION } from './privacy.constants';
import { PrivacyPreferenceEntity } from './privacy-preference.entity';
import { UserLegalAcceptanceEntity } from './user-legal-acceptance.entity';

type RegistrationContext = { ip?: string | null; userAgent?: string | null };

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(UserLegalAcceptanceEntity) private readonly acceptances: Repository<UserLegalAcceptanceEntity>,
    @InjectRepository(PrivacyPreferenceEntity) private readonly preferences: Repository<PrivacyPreferenceEntity>,
    @InjectRepository(DataSubjectRequestEntity) private readonly requests: Repository<DataSubjectRequestEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  versions() {
    return { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };
  }

  assertCurrentAcceptance(input: { legalAccepted?: boolean; termsVersion?: string; privacyVersion?: string }) {
    if (!input.legalAccepted || input.termsVersion !== TERMS_VERSION || input.privacyVersion !== PRIVACY_VERSION) {
      throw new BadRequestException('Приемете актуалните Условия за ползване и Политика за поверителност');
    }
  }

  async recordRegistrationAcceptance(manager: EntityManager, userId: number, context: RegistrationContext = {}) {
    const repo = manager.getRepository(UserLegalAcceptanceEntity);
    const metadata = {
      ipHash: this.hashMetadata(context.ip),
      userAgentHash: this.hashMetadata(context.userAgent),
    };
    await repo.save([
      repo.create({ userId, documentType: 'terms', documentVersion: TERMS_VERSION, source: 'registration', ...metadata }),
      repo.create({ userId, documentType: 'privacy', documentVersion: PRIVACY_VERSION, source: 'registration', ...metadata }),
    ]);
  }

  async acceptCurrentDocuments(userId: number, context: RegistrationContext = {}) {
    await this.acceptances.manager.transaction((manager) =>
      this.recordAcceptances(manager, userId, 'account', context),
    );
    return this.getStatus(userId);
  }

  async getStatus(userId: number) {
    const [acceptances, preferences, requests] = await Promise.all([
      this.acceptances.find({ where: { userId }, order: { acceptedAt: 'DESC' } }),
      this.preferences.findOneBy({ userId }),
      this.requests.find({ where: { userId }, order: { requestedAt: 'DESC' } }),
    ]);
    return {
      versions: this.versions(),
      acceptances: acceptances.map(({ documentType, documentVersion, source, acceptedAt }) => ({ documentType, documentVersion, source, acceptedAt })),
      preferences: preferences || { userId, analyticsConsent: false, marketingConsent: false, consentVersion: PRIVACY_VERSION, updatedAt: null },
      requests: requests.map((request) => this.publicRequest(request)),
      optionalTrackingActive: false,
    };
  }

  async updatePreferences(userId: number, dto: UpdatePrivacyPreferencesDto) {
    const preference = this.preferences.create({ userId, analyticsConsent: dto.analyticsConsent, marketingConsent: dto.marketingConsent, consentVersion: PRIVACY_VERSION });
    await this.preferences.save(preference);
    return this.getStatus(userId);
  }

  async createRequest(userId: number, dto: CreatePrivacyRequestDto) {
    const existing = await this.requests.findOne({ where: { userId, requestType: dto.requestType, status: In(['submitted', 'in_review']) } });
    if (existing) throw new BadRequestException('Вече има активна заявка от този тип');
    const dueAt = new Date();
    dueAt.setMonth(dueAt.getMonth() + 1);
    return this.requests.save(this.requests.create({ userId, requestType: dto.requestType, status: 'submitted', details: dto.details.trim(), responseNotes: null, dueAt, completedAt: null }));
  }

  listOwnRequests(userId: number) {
    return this.requests
      .find({ where: { userId }, order: { requestedAt: 'DESC' } })
      .then((requests) => requests.map((request) => this.publicRequest(request)));
  }

  async exportData(userId: number) {
    const [accountData, privacy] = await Promise.all([this.usersService.exportAccountData(userId), this.getStatus(userId)]);
    return { ...accountData, privacy };
  }

  async listAdminRequests(status?: string) {
    const records = await this.requests.find({ where: status ? { status: status as any } : {}, order: { requestedAt: 'DESC' } });
    const userIds = [...new Set(records.map((record) => record.userId))];
    const users = userIds.length ? await this.users.findBy({ id: In(userIds) }) : [];
    const byId = new Map(users.map((user) => [user.id, user]));
    return records.map((record) => ({ ...record, user: { id: record.userId, name: byId.get(record.userId)?.name || 'Премахнат профил', email: byId.get(record.userId)?.email || null } }));
  }

  async updateAdminRequest(adminUserId: number, requestId: number, dto: UpdatePrivacyRequestDto) {
    const record = await this.requests.findOneBy({ id: requestId });
    if (!record) throw new NotFoundException('Заявката не е намерена');
    if (['completed', 'rejected'].includes(dto.status) && !dto.responseNotes?.trim()) throw new BadRequestException('Бележка с резултата е задължителна');
    await this.requests.manager.transaction(async (manager) => {
      record.status = dto.status;
      record.responseNotes = dto.responseNotes?.trim() || null;
      record.completedAt = ['completed', 'rejected'].includes(dto.status) ? new Date() : null;
      await manager.getRepository(DataSubjectRequestEntity).save(record);
      await manager.getRepository(AdminAuditLogEntity).save({ adminUserId, action: 'privacy_request_updated', targetType: 'data_subject_request', targetId: String(record.id), reason: record.responseNotes, metadataJson: { status: record.status, requestType: record.requestType, userId: record.userId } });
      await manager.getRepository(NotificationEntity).save({ userId: record.userId, type: 'privacy_request_updated', message: `Заявката ви за лични данни е със статус: ${record.status}.`, requestId: null, isRead: false, payloadJson: { privacyRequestId: record.id, status: record.status }, readAt: null });
    });
    return this.requests.findOneBy({ id: requestId });
  }

  private hashMetadata(value?: string | null) {
    if (!value) return null;
    const secret = this.config.get<string>('JWT_SECRET') || 'bricky-privacy-metadata';
    return createHmac('sha256', secret).update(value).digest('hex');
  }

  private async recordAcceptances(
    manager: EntityManager,
    userId: number,
    source: string,
    context: RegistrationContext,
  ) {
    const repo = manager.getRepository(UserLegalAcceptanceEntity);
    const metadata = {
      ipHash: this.hashMetadata(context.ip),
      userAgentHash: this.hashMetadata(context.userAgent),
    };
    await repo.upsert(
      [
        { userId, documentType: 'terms', documentVersion: TERMS_VERSION, source, ...metadata },
        { userId, documentType: 'privacy', documentVersion: PRIVACY_VERSION, source, ...metadata },
      ],
      ['userId', 'documentType', 'documentVersion'],
    );
  }

  private publicRequest(request: DataSubjectRequestEntity) {
    const { responseNotes: _internalNotes, ...publicFields } = request;
    return publicFields;
  }
}

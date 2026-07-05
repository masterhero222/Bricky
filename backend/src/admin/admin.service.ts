import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity } from '../requests/entities/request.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { ModerationStatus, MODERATION_STATUSES } from '../moderation/moderation.types';
import { AdminAuditLogEntity } from './entities/admin-audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RequestEntity) private readonly requests: Repository<RequestEntity>,
    @InjectRepository(RequestImageEntity) private readonly media: Repository<RequestImageEntity>,
    @InjectRepository(AdminAuditLogEntity) private readonly audit: Repository<AdminAuditLogEntity>,
  ) {}

  dashboard() {
    return Promise.all([
      this.requests.count({ where: { moderationStatus: 'pending_review' } }),
      this.media.count({ where: { moderationStatus: 'pending_review' } }),
    ]).then(([pendingRequests, pendingMedia]) => ({ pendingRequests, pendingMedia }));
  }

  listRequests(status?: ModerationStatus) {
    return this.requests.find({
      where: status ? { moderationStatus: status } : {},
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  listMedia(status?: ModerationStatus) {
    return this.media.find({
      where: status ? { moderationStatus: status } : {},
      order: { created_at: 'DESC' },
    });
  }

  listAudit() {
    return this.audit.find({ order: { created_at: 'DESC' }, take: 200 });
  }

  async moderateRequest(id: number, status: ModerationStatus, adminUserId: number, reason?: string) {
    this.assertStatus(status);
    const entity = await this.requests.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Request not found');
    entity.moderationStatus = status;
    entity.moderationReason = reason?.trim() || null;
    entity.moderatedByUserId = adminUserId;
    entity.moderatedAt = new Date();
    await this.requests.save(entity);
    await this.writeAudit(adminUserId, 'request', id, status, entity.moderationReason);
    return entity;
  }

  async moderateMedia(id: number, status: ModerationStatus, adminUserId: number, reason?: string) {
    this.assertStatus(status);
    const entity = await this.media.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Media not found');
    entity.moderationStatus = status;
    entity.isApproved = status === 'approved';
    entity.moderationReason = reason?.trim() || null;
    entity.moderatedByUserId = adminUserId;
    entity.moderatedAt = new Date();
    await this.media.save(entity);
    await this.writeAudit(adminUserId, 'request_media', id, status, entity.moderationReason);
    return entity;
  }

  private assertStatus(status: string): asserts status is ModerationStatus {
    if (!MODERATION_STATUSES.includes(status as ModerationStatus) || status === 'pending_review') {
      throw new BadRequestException('Invalid moderation action');
    }
  }

  private writeAudit(adminUserId: number, entityType: string, entityId: number, action: string, reason: string | null) {
    return this.audit.save(this.audit.create({ adminUserId, entityType, entityId, action, reason, metadata: null }));
  }
}


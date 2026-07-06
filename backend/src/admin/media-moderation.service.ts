import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { WorkerGalleryImage } from '../workers/worker-gallery-image.entity';
import { Worker } from '../workers/worker.entity';
import { ModerationStatus, MODERATION_STATUSES } from '../moderation/moderation.types';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAuditLogEntity } from './entities/admin-audit-log.entity';

@Injectable()
export class MediaModerationService {
  constructor(
    @InjectRepository(RequestImageEntity) private readonly requestMedia: Repository<RequestImageEntity>,
    @InjectRepository(WorkerGalleryImage) private readonly galleryMedia: Repository<WorkerGalleryImage>,
    @InjectRepository(Worker) private readonly workers: Repository<Worker>,
    @InjectRepository(AdminAuditLogEntity) private readonly audit: Repository<AdminAuditLogEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  async moderateRequestImage(id: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    const entity = await this.requestMedia.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Media not found');
    const oldValue = this.snapshot(entity);
    this.apply(entity, status, adminUserId, reason);
    entity.isApproved = status === 'approved';
    await this.requestMedia.save(entity);
    await this.record(adminUserId, 'request_media', id, status, entity.moderationReason, oldValue, this.snapshot(entity), ipAddress);
    if (status === 'rejected' && entity.uploaderUserId) {
      await this.notify(entity.uploaderUserId, 'request_media_rejected', `Снимка към заявка #${entity.requestId} е отхвърлена`, entity.moderationReason, entity.requestId);
    }
    return entity;
  }

  async moderateGalleryImage(id: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    const entity = await this.galleryMedia.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Gallery media not found');
    const oldValue = this.snapshot(entity);
    this.apply(entity, status, adminUserId, reason);
    await this.galleryMedia.save(entity);
    await this.record(adminUserId, 'worker_gallery', id, status, entity.moderationReason, oldValue, this.snapshot(entity), ipAddress);
    if (status === 'rejected') {
      await this.notify(entity.userId, 'gallery_media_rejected', `Снимка от галерията #${id} е отхвърлена`, entity.moderationReason);
    }
    return entity;
  }

  async moderateAvatar(workerId: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    this.assertAction(status, reason);
    const entity = await this.workers.findOne({ where: { id: workerId } });
    if (!entity) throw new NotFoundException('Worker not found');
    const oldValue = { moderationStatus: entity.avatarModerationStatus, moderationReason: entity.avatarModerationReason ?? null };
    entity.avatarModerationStatus = status;
    entity.avatarModerationReason = reason?.trim() || null;
    entity.avatarModeratedByUserId = adminUserId;
    entity.avatarModeratedAt = new Date();
    await this.workers.save(entity);
    const newValue = { moderationStatus: entity.avatarModerationStatus, moderationReason: entity.avatarModerationReason ?? null };
    await this.record(adminUserId, 'worker_avatar', workerId, status, entity.avatarModerationReason, oldValue, newValue, ipAddress);
    if (status === 'rejected') {
      await this.notify(entity.userId, 'avatar_rejected', 'Профилната снимка е отхвърлена', entity.avatarModerationReason);
    }
    return entity;
  }

  private apply(entity: RequestImageEntity | WorkerGalleryImage, status: ModerationStatus, adminUserId: number, reason?: string) {
    this.assertAction(status, reason);
    entity.moderationStatus = status;
    entity.moderationReason = reason?.trim() || null;
    entity.moderatedByUserId = adminUserId;
    entity.moderatedAt = new Date();
  }

  private assertAction(status: ModerationStatus, reason?: string) {
    if (!MODERATION_STATUSES.includes(status) || status === 'pending_review') throw new BadRequestException('Invalid moderation action');
    if (status !== 'approved' && !reason?.trim()) throw new BadRequestException('Reason is required');
  }

  private snapshot(entity: RequestImageEntity | WorkerGalleryImage) {
    return { moderationStatus: entity.moderationStatus, moderationReason: entity.moderationReason ?? null };
  }

  private record(adminUserId: number, entityType: string, entityId: number, action: string, reason: string | null, oldValue: object, newValue: object, ipAddress?: string) {
    return this.audit.save(this.audit.create({
      adminUserId, entityType, entityId, action, reason, metadata: null, oldValue, newValue,
      ipAddress: ipAddress || null,
    }));
  }

  private notify(userId: number, type: string, prefix: string, reason?: string | null, requestId?: number) {
    const suffix = reason ? ` Причина: ${reason}` : '';
    return this.notifications.create(userId, { type, message: `${prefix}.${suffix}`, requestId: requestId ?? null });
  }
}

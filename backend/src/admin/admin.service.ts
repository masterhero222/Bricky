import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { RequestEntity } from '../requests/entities/request.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { ModerationStatus, MODERATION_STATUSES } from '../moderation/moderation.types';
import { AdminAuditLogEntity } from './entities/admin-audit-log.entity';
import { Worker } from '../workers/worker.entity';
import { WorkerGalleryImage } from '../workers/worker-gallery-image.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from '../users/user.entity';
import { unlink } from 'fs/promises';
import { getUploadPath } from '../common/storage-paths';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RequestEntity) private readonly requests: Repository<RequestEntity>,
    @InjectRepository(RequestImageEntity) private readonly media: Repository<RequestImageEntity>,
    @InjectRepository(Worker) private readonly workers: Repository<Worker>,
    @InjectRepository(WorkerGalleryImage) private readonly gallery: Repository<WorkerGalleryImage>,
    @InjectRepository(ReviewEntity) private readonly reviews: Repository<ReviewEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AdminAuditLogEntity) private readonly audit: Repository<AdminAuditLogEntity>,
  ) {}

  dashboard() {
    return Promise.all([
      this.requests.count({ where: { moderationStatus: 'pending_review' } }),
      this.media.count({ where: { moderationStatus: 'pending_review' } }),
      this.gallery.count({ where: { moderationStatus: 'pending_review' } }),
      this.workers.count({ where: { avatarModerationStatus: 'pending_review' } }),
      this.workers.count({ where: { moderationStatus: 'pending_review' } }),
      this.reviews.count({ where: { moderationStatus: 'pending_review' } }),
      this.requests.count({ where: { moderationStatus: 'approved', completedAt: IsNull() } }),
      this.requests.count({ where: { moderationStatus: 'approved', completedAt: Not(IsNull()) } }),
      this.users.count({ where: { accountStatus: 'active' } }),
      this.workers.count({ where: { moderationStatus: 'approved' } }),
      this.audit.find({ order: { created_at: 'DESC' }, take: 10 }),
    ]).then(([pendingRequests, requestMedia, galleryMedia, avatarMedia, pendingWorkers, pendingReviews, activeRequests, completedRequests, activeUsers, activeWorkers, recentActions]) => ({
      pendingRequests,
      pendingMedia: requestMedia + galleryMedia + avatarMedia,
      pendingWorkers,
      pendingReviews,
      activeRequests,
      completedRequests,
      activeUsers,
      activeWorkers,
      recentActions,
      systemHealth: { api: 'ok', database: 'ok' },
    }));
  }

  async listRequests(status?: ModerationStatus, q = '', page = 1, limit = 25) {
    const rows = await this.requests.find({
      where: status ? { moderationStatus: status } : {},
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
    return this.paginate(rows.filter((item) => this.matches(item, q, ['category', 'description', 'address', 'clientName', 'email'])), page, limit);
  }

  async listMedia(status?: ModerationStatus, q = '', page = 1, limit = 25) {
    const [requestMedia, galleryMedia, avatars] = await Promise.all([
      this.media.find({ where: status ? { moderationStatus: status } : {}, order: { created_at: 'DESC' } }),
      this.gallery.find({ where: status ? { moderationStatus: status } : {}, order: { created_at: 'DESC' } }),
      this.workers.find({ where: status ? { avatarModerationStatus: status } : {}, order: { createdAt: 'DESC' } }),
    ]);
    const rows = [
      ...requestMedia.map((item) => ({ ...item, source: 'request' })),
      ...galleryMedia.map((item) => ({ ...item, source: 'gallery' })),
      ...avatars.filter((item) => item.avatarUrl).map((item) => ({
        id: item.id, userId: item.userId, url: item.avatarUrl, source: 'avatar',
        moderationStatus: item.avatarModerationStatus, moderationReason: item.avatarModerationReason,
        created_at: item.createdAt,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return this.paginate(rows.filter((item) => this.matches(item, q, ['name', 'url', 'source'])), page, limit);
  }

  async listWorkers(status?: ModerationStatus, q = '', page = 1, limit = 25) {
    const rows = await this.workers.find({ where: status ? { moderationStatus: status } : {}, order: { createdAt: 'DESC' } });
    return this.paginate(rows.filter((item) => this.matches(item, q, ['fullName', 'email', 'city', 'description'])), page, limit);
  }

  async listReviews(status?: ModerationStatus, q = '', page = 1, limit = 25) {
    const rows = await this.reviews.find({ where: status ? { moderationStatus: status } : {}, order: { created_at: 'DESC' } });
    return this.paginate(rows.filter((item) => this.matches(item, q, ['comment', 'rating', 'workerUserId', 'clientUserId'])), page, limit);
  }

  async listUsers() {
    const rows = await this.users.find({ order: { id: 'DESC' } });
    return rows.map(({ password: _password, ...user }) => user);
  }

  async getRequest(id: number) {
    const entity = await this.requests.findOne({ where: { id }, relations: ['client'] });
    if (!entity) throw new NotFoundException('Request not found');
    return entity;
  }

  async getMedia(source: 'request' | 'gallery' | 'avatar', id: number) {
    if (source === 'gallery') {
      const entity = await this.gallery.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Media not found');
      return { ...entity, source };
    }
    if (source === 'avatar') {
      const entity = await this.workers.findOne({ where: { id } });
      if (!entity?.avatarUrl) throw new NotFoundException('Media not found');
      return { id: entity.id, userId: entity.userId, url: entity.avatarUrl, source, moderationStatus: entity.avatarModerationStatus };
    }
    const entity = await this.media.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Media not found');
    return { ...entity, source };
  }

  async getWorker(id: number) {
    const entity = await this.workers.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Worker not found');
    return entity;
  }

  async getReview(id: number) {
    const entity = await this.reviews.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Review not found');
    return entity;
  }

  listAudit() {
    return this.audit.find({ order: { created_at: 'DESC' }, take: 200 });
  }

  async moderateRequest(id: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    this.assertStatus(status);
    this.assertReason(status, reason);
    const entity = await this.requests.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Request not found');
    const oldValue = this.moderationSnapshot(entity);
    entity.moderationStatus = status;
    entity.moderationReason = reason?.trim() || null;
    entity.moderatedByUserId = adminUserId;
    entity.moderatedAt = new Date();
    await this.requests.save(entity);
    await this.writeAudit(adminUserId, 'request', id, status, entity.moderationReason, oldValue, this.moderationSnapshot(entity), ipAddress);
    return entity;
  }

  async editRequest(id: number, patch: Record<string, unknown>, adminUserId: number, reason?: string, ipAddress?: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
    const entity = await this.requests.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Request not found');
    const allowed = ['category', 'categoryKey', 'description', 'address'] as const;
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    for (const field of allowed) {
      if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
      oldValue[field] = entity[field];
      const value = patch[field];
      (entity as any)[field] = value == null ? null : String(value).trim();
      newValue[field] = (entity as any)[field];
    }
    if (!Object.keys(newValue).length) throw new BadRequestException('No editable fields supplied');
    await this.requests.save(entity);
    await this.writeAudit(adminUserId, 'request', id, 'edited', reason?.trim() || null, oldValue, newValue, ipAddress);
    return entity;
  }

  async deleteRequest(id: number, adminUserId: number, reason?: string, ipAddress?: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
    const entity = await this.requests.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Request not found');
    const images = await this.media.find({ where: { requestId: id } });
    await this.writeAudit(adminUserId, 'request', id, 'deleted', reason?.trim() || null, this.requestSnapshot(entity), null, ipAddress);
    await this.media.delete({ requestId: id });
    await this.requests.delete({ id });
    await Promise.all(images.map((image) => image.storageKey ? unlink(getUploadPath(image.storageKey)).catch(() => undefined) : undefined));
    return { ok: true, id };
  }

  async moderateMedia(id: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    this.assertStatus(status);
    this.assertReason(status, reason);
    const entity = await this.media.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Media not found');
    const oldValue = this.moderationSnapshot(entity);
    entity.moderationStatus = status;
    entity.isApproved = status === 'approved';
    entity.moderationReason = reason?.trim() || null;
    entity.moderatedByUserId = adminUserId;
    entity.moderatedAt = new Date();
    await this.media.save(entity);
    await this.writeAudit(adminUserId, 'request_media', id, status, entity.moderationReason, oldValue, this.moderationSnapshot(entity), ipAddress);
    return entity;
  }

  async moderateGallery(id: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    this.assertStatus(status);
    this.assertReason(status, reason);
    const entity = await this.gallery.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Gallery media not found');
    const oldValue = this.moderationSnapshot(entity);
    this.applyModeration(entity, status, adminUserId, reason);
    await this.gallery.save(entity);
    await this.writeAudit(adminUserId, 'worker_gallery', id, status, entity.moderationReason, oldValue, this.moderationSnapshot(entity), ipAddress);
    return entity;
  }

  async moderateWorker(id: number, target: 'profile' | 'avatar', status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    this.assertStatus(status);
    this.assertReason(status, reason);
    const entity = await this.workers.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Worker not found');
    const oldValue = target === 'avatar' ? this.avatarSnapshot(entity) : this.moderationSnapshot(entity);
    const value = reason?.trim() || null;
    if (target === 'avatar') {
      entity.avatarModerationStatus = status; entity.avatarModerationReason = value;
      entity.avatarModeratedByUserId = adminUserId; entity.avatarModeratedAt = new Date();
    } else {
      entity.moderationStatus = status; entity.moderationReason = value;
      entity.moderatedByUserId = adminUserId; entity.moderatedAt = new Date();
      entity.isApproved = status === 'approved';
    }
    await this.workers.save(entity);
    const newValue = target === 'avatar' ? this.avatarSnapshot(entity) : this.moderationSnapshot(entity);
    await this.writeAudit(adminUserId, `worker_${target}`, id, status, value, oldValue, newValue, ipAddress);
    return entity;
  }

  async moderateReview(id: number, status: ModerationStatus, adminUserId: number, reason?: string, ipAddress?: string) {
    this.assertStatus(status);
    this.assertReason(status, reason);
    const entity = await this.reviews.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Review not found');
    const oldValue = this.moderationSnapshot(entity);
    this.applyModeration(entity, status, adminUserId, reason);
    await this.reviews.save(entity);
    await this.writeAudit(adminUserId, 'review', id, status, entity.moderationReason, oldValue, this.moderationSnapshot(entity), ipAddress);
    return entity;
  }

  async setUserStatus(id: number, action: 'activate' | 'suspend', adminUserId: number, reason?: string, ipAddress?: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
    if (id === adminUserId && action === 'suspend') throw new BadRequestException('Admin cannot suspend own account');
    const entity = await this.users.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');
    const oldValue = { accountStatus: entity.accountStatus };
    entity.accountStatus = action === 'suspend' ? 'suspended' : 'active';
    await this.users.save(entity);
    await this.writeAudit(adminUserId, 'user', id, action, reason?.trim() || null, oldValue, { accountStatus: entity.accountStatus }, ipAddress);
    const { password: _password, ...safe } = entity;
    return safe;
  }

  private assertStatus(status: string): asserts status is ModerationStatus {
    if (!MODERATION_STATUSES.includes(status as ModerationStatus) || status === 'pending_review') {
      throw new BadRequestException('Invalid moderation action');
    }
  }

  private assertReason(status: ModerationStatus, reason?: string) {
    if (status !== 'approved' && !reason?.trim()) throw new BadRequestException('Reason is required');
  }

  private applyModeration(entity: any, status: ModerationStatus, adminUserId: number, reason?: string) {
    entity.moderationStatus = status;
    entity.moderationReason = reason?.trim() || null;
    entity.moderatedByUserId = adminUserId;
    entity.moderatedAt = new Date();
  }

  private matches(item: any, q: string, fields: string[]) {
    const needle = String(q || '').trim().toLowerCase();
    if (!needle) return true;
    return fields.some((field) => String(item?.[field] ?? '').toLowerCase().includes(needle));
  }

  private paginate<T>(rows: T[], page: number, limit: number) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const safePage = Math.max(1, Number(page) || 1);
    return rows.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  }

  private moderationSnapshot(entity: any) {
    return { moderationStatus: entity.moderationStatus, moderationReason: entity.moderationReason ?? null };
  }

  private avatarSnapshot(entity: Worker) {
    return { moderationStatus: entity.avatarModerationStatus, moderationReason: entity.avatarModerationReason ?? null };
  }

  private requestSnapshot(entity: RequestEntity) {
    return {
      id: entity.id, category: entity.category, categoryKey: entity.categoryKey,
      description: entity.description, address: entity.address,
      status: entity.status, moderationStatus: entity.moderationStatus,
    };
  }

  private writeAudit(
    adminUserId: number, entityType: string, entityId: number, action: string, reason: string | null,
    oldValue: Record<string, unknown> | null = null, newValue: Record<string, unknown> | null = null,
    ipAddress: string | null = null,
  ) {
    return this.audit.save(this.audit.create({
      adminUserId, entityType, entityId, action, reason, metadata: null, oldValue, newValue, ipAddress,
    }));
  }
}

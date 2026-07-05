import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity } from '../requests/entities/request.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { ModerationStatus, MODERATION_STATUSES } from '../moderation/moderation.types';
import { AdminAuditLogEntity } from './entities/admin-audit-log.entity';
import { Worker } from '../workers/worker.entity';
import { WorkerGalleryImage } from '../workers/worker-gallery-image.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from '../users/user.entity';

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
    ]).then(([pendingRequests, requestMedia, galleryMedia, avatarMedia, pendingWorkers, pendingReviews]) => ({
      pendingRequests,
      pendingMedia: requestMedia + galleryMedia + avatarMedia,
      pendingWorkers,
      pendingReviews,
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

  async moderateGallery(id: number, status: ModerationStatus, adminUserId: number, reason?: string) {
    this.assertStatus(status);
    const entity = await this.gallery.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Gallery media not found');
    this.applyModeration(entity, status, adminUserId, reason);
    await this.gallery.save(entity);
    await this.writeAudit(adminUserId, 'worker_gallery', id, status, entity.moderationReason);
    return entity;
  }

  async moderateWorker(id: number, target: 'profile' | 'avatar', status: ModerationStatus, adminUserId: number, reason?: string) {
    this.assertStatus(status);
    const entity = await this.workers.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Worker not found');
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
    await this.writeAudit(adminUserId, `worker_${target}`, id, status, value);
    return entity;
  }

  async moderateReview(id: number, status: ModerationStatus, adminUserId: number, reason?: string) {
    this.assertStatus(status);
    const entity = await this.reviews.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Review not found');
    this.applyModeration(entity, status, adminUserId, reason);
    await this.reviews.save(entity);
    await this.writeAudit(adminUserId, 'review', id, status, entity.moderationReason);
    return entity;
  }

  async setUserStatus(id: number, action: 'activate' | 'suspend', adminUserId: number, reason?: string) {
    if (id === adminUserId && action === 'suspend') throw new BadRequestException('Admin cannot suspend own account');
    const entity = await this.users.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');
    entity.accountStatus = action === 'suspend' ? 'suspended' : 'active';
    await this.users.save(entity);
    await this.writeAudit(adminUserId, 'user', id, action, reason?.trim() || null);
    const { password: _password, ...safe } = entity;
    return safe;
  }

  private assertStatus(status: string): asserts status is ModerationStatus {
    if (!MODERATION_STATUSES.includes(status as ModerationStatus) || status === 'pending_review') {
      throw new BadRequestException('Invalid moderation action');
    }
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

  private writeAudit(adminUserId: number, entityType: string, entityId: number, action: string, reason: string | null) {
    return this.audit.save(this.audit.create({ adminUserId, entityType, entityId, action, reason, metadata: null }));
  }
}

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { WorkerGalleryImage } from './worker-gallery-image.entity';
import { RequestEntity } from '../requests/entities/request.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { deleteStoredMedia } from '../common/media-storage';
import { UserEntity } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

type CreateWorkerProfileInput = {
  userId: number;
  phone?: string;
  city?: string;
  skills?: string[];
};

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,

    @InjectRepository(WorkerGalleryImage)
    private readonly galleryRepo: Repository<WorkerGalleryImage>,

    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,

    @InjectRepository(RequestImageEntity)
    private readonly requestImageRepo: Repository<RequestImageEntity>,

    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  private async activeWorkerUserIds(userIds: number[]) {
    const ids = Array.from(new Set(userIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)));
    if (!ids.length) return new Set<number>();
    const users = await this.usersRepo.find({
      where: { id: In(ids), role: 'worker', accountStatus: 'active' },
      select: { id: true },
    });
    return new Set(users.map((user) => Number(user.id)));
  }

  private async assertPublicWorker(worker: Worker) {
    if (worker.moderationStatus !== 'approved') throw new NotFoundException('Worker not found');
    const user = await this.usersRepo.findOne({
      where: { id: Number(worker.userId), role: 'worker', accountStatus: 'active' },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Worker not found');
  }

  /**
   * LEGACY: Register worker as standalone account in workers table
   */
  async registerWorker(dto: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
    skills?: string[];
  }) {
    const existing = await this.workerRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Имейлът вече съществува');

    const hash = await bcrypt.hash(dto.password, 10);

    const worker = this.workerRepository.create({
      userId: 0 as any, // legacy акаунт без users.id
      fullName: dto.fullName,
      email: dto.email,
      password: hash,
      phone: dto.phone ?? null,
      city: dto.city ?? null,
      skills: dto.skills ?? [],
    } as any);

    const saved = (await this.workerRepository.save(worker as any)) as Worker;

    this.logger.log(`Нов майстор (legacy): ${saved.fullName ?? '-'} (${saved.email ?? '-'})`);
    return saved;
  }

  async findByEmail(email: string) {
    return this.workerRepository.findOne({ where: { email } });
  }

  async findById(id: number) {
    return this.workerRepository.findOne({ where: { id } });
  }

  async findByUserId(userId: number) {
    const worker = await this.workerRepository.findOne({ where: { userId } });
    return worker ? this.withGallerySummary(worker, true) : worker;
  }

  /**
   * ✅ SMART LOOKUP:
   * Clients might send worker.id OR userId.
   */
  async findOneSmart(idOrUserId: number) {
    const n = Number(idOrUserId);
    if (!Number.isFinite(n) || n <= 0) throw new BadRequestException('Invalid worker identifier');

    // 1) try as userId
    let worker = await this.workerRepository.findOne({ where: { userId: n } });

    // 2) fallback: try as primary key id
    if (!worker) worker = await this.workerRepository.findOne({ where: { id: n } });

    if (!worker) throw new NotFoundException('Worker not found');
    await this.assertPublicWorker(worker);
    return this.withGallerySummary(worker);
  }

  /**
   * NEW: Create worker profile linked to users.id (userId)
   */
  async createWorkerProfile(data: CreateWorkerProfileInput) {
    const uid = Number(data?.userId);
    if (!uid) throw new BadRequestException('Missing userId');

    const existing = await this.findByUserId(uid);
    if (existing) return existing;

    const worker = this.workerRepository.create({
      userId: uid,
      phone: data.phone ?? null,
      city: data.city ?? null,
      skills: data.skills ?? [],
      isApproved: false,
      moderationStatus: 'pending_review',
      moderationReason: null,
      moderatedByUserId: null,
      moderatedAt: null,
      avatarModerationStatus: 'pending_review',
      avatarModerationReason: null,
      avatarModeratedByUserId: null,
      avatarModeratedAt: null,
    } as any);

    const saved = (await this.workerRepository.save(worker as any)) as Worker;

    this.logger.log(`Worker profile created for userId=${saved.userId}`);
    return saved;
  }

  async findByUserIds(userIds: number[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const clean = userIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (clean.length === 0) return [];

    const workers = await this.workerRepository.find({ where: { userId: In(clean), moderationStatus: 'approved' } });
    const activeIds = await this.activeWorkerUserIds(workers.map((worker) => worker.userId));
    return Promise.all(workers.filter((worker) => activeIds.has(Number(worker.userId))).map((worker) => this.withGallerySummary(worker)));
  }

  async findByIdsSmart(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const clean = ids
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (clean.length === 0) return [];

    const workers = await this.workerRepository.find({
      where: [{ id: In(clean), moderationStatus: 'approved' }, { userId: In(clean), moderationStatus: 'approved' }],
    });
    const activeIds = await this.activeWorkerUserIds(workers.map((worker) => worker.userId));
    return Promise.all(workers.filter((worker) => activeIds.has(Number(worker.userId))).map((worker) => this.withGallerySummary(worker)));
  }

  async updateProfile(id: number, data: Partial<Worker>) {
    await this.workerRepository.update({ id }, data as any);
    return this.findById(id);
  }

  async updateProfileByUserId(userId: number, data: Partial<Worker>) {
    const profileFields = ['fullName', 'city', 'skills', 'description', 'experience', 'equipment'];
    const touchesProfile = profileFields.some((field) => Object.prototype.hasOwnProperty.call(data, field));
    const touchesAvatar = Object.prototype.hasOwnProperty.call(data, 'avatarUrl');
    const update: Partial<Worker> = { ...data };
    if (touchesProfile) {
      update.moderationStatus = 'pending_review';
      update.moderationReason = null;
      update.moderatedByUserId = null;
      update.moderatedAt = null;
      update.isApproved = false;
    }
    if (touchesAvatar) {
      update.avatarModerationStatus = 'pending_review';
      update.avatarModerationReason = null;
      update.avatarModeratedByUserId = null;
      update.avatarModeratedAt = null;
    }
    await this.workerRepository.update({ userId }, update as any);
    return this.findByUserId(userId);
  }

  async getAll() {
    const workers = await this.workerRepository.find({ where: { moderationStatus: 'approved' } });
    const activeIds = await this.activeWorkerUserIds(workers.map((worker) => worker.userId));
    return Promise.all(workers.filter((worker) => activeIds.has(Number(worker.userId))).map((worker) => this.withGallerySummary(worker)));
  }

  // =========================
  // ✅ GALLERY
  // =========================
  async getGalleryByUserId(userId: number, includeUnapproved = false) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const rows = await this.galleryRepo.find({
      where: includeUnapproved ? { userId: uid } : { userId: uid, moderationStatus: 'approved' },
      order: { created_at: 'DESC' },
    });
    return rows.map((row) => ({
      ...row,
      url: this.normalizeUploadUrl(row.url),
      thumbnailUrl: this.normalizeUploadUrl(row.thumbnailUrl),
    }));
  }

  async addGalleryImages(userId: number, images: Array<string | { url: string; thumbnailUrl?: string; storageKey?: string; thumbnailStorageKey?: string }>) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const clean = (Array.isArray(images) ? images : []).map((image) => typeof image === 'string' ? { url: image } : image)
      .filter((image) => Boolean(String(image?.url || '').trim()));

    if (clean.length === 0) throw new BadRequestException('No images');

    const rows = clean.map((image) => this.galleryRepo.create({
      userId: uid, url: image.url, thumbnailUrl: image.thumbnailUrl || null,
      storageKey: image.storageKey || null, thumbnailStorageKey: image.thumbnailStorageKey || null,
      moderationStatus: 'pending_review', moderationReason: null,
      moderatedByUserId: null, moderatedAt: null,
    }));
    await this.galleryRepo.save(rows);

    return this.getGalleryByUserId(uid, true);
  }

  async deleteGalleryImage(userId: number, imageId: number) {
    const uid = Number(userId);
    const id = Number(imageId);

    if (!uid) throw new BadRequestException('Invalid userId');
    if (!id) throw new BadRequestException('Invalid imageId');

    const img = await this.galleryRepo.findOne({ where: { id } });
    if (!img) throw new NotFoundException('Image not found');
    if (Number(img.userId) !== uid) throw new BadRequestException('Not your image');

    await this.galleryRepo.delete({ id });
    await deleteStoredMedia(img.storageKey, img.thumbnailStorageKey);
    return { ok: true };
  }

  storageKeyFromUploadUrl(url?: string | null) {
    const value = String(url || '');
    const marker = '/uploads/';
    const index = value.indexOf(marker);
    return index >= 0 ? value.slice(index + marker.length) : null;
  }

  async getHistoryByUserId(userId: number, includeUnapproved = false) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const rows = await this.requestRepo.find({
      where: [{ assignedWorkerId: uid }, { completedByWorkerId: uid }],
      relations: ['client'],
      order: { completedAt: 'DESC', created_at: 'DESC' },
    });

    return this.hydrateHistoryImages(
      rows.filter((request) => this.isCompletedRequest(request, uid) && (includeUnapproved || request.moderationStatus === 'approved')),
      includeUnapproved,
    );
  }

  private async hydrateHistoryImages(requests: RequestEntity[], includeUnapproved = false) {
    const requestIds = requests.map((request) => Number(request.id)).filter(Boolean);
    if (requestIds.length === 0) return requests;

    const imageRows = await this.requestImageRepo.find({
      where: includeUnapproved
        ? { requestId: In(requestIds) }
        : { requestId: In(requestIds), moderationStatus: 'approved' },
      order: { requestId: 'ASC', kind: 'ASC', sortOrder: 'ASC', created_at: 'ASC' },
    });

    const imagesByRequest = new Map<number, RequestImageEntity[]>();
    for (const image of imageRows) {
      const images = imagesByRequest.get(image.requestId) || [];
      images.push(image);
      imagesByRequest.set(image.requestId, images);
    }

    return requests.map((request) => {
      const rows = imagesByRequest.get(Number(request.id)) || [];
      if (rows.length === 0) return request;

      const toPhotos = (kind: RequestImageEntity['kind']) =>
        rows
          .filter((row) => row.kind === kind)
          .map((row) => ({
            id: row.id,
            name: row.name || 'Photo',
            url: this.normalizeUploadUrl(row.url),
            thumbnailUrl: this.normalizeUploadUrl(row.thumbnailUrl),
            storageKey: row.storageKey,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            kind: row.kind,
            created_at: row.created_at,
          }));

      const generalPhotos = toPhotos('general');
      const beforePhotos = toPhotos('before');
      const afterPhotos = toPhotos('after');

      request.beforePhotos = beforePhotos.length ? beforePhotos : request.beforePhotos;
      request.afterPhotos = afterPhotos.length ? afterPhotos : request.afterPhotos;
      request.photos = [...generalPhotos, ...beforePhotos];
      return request;
    });
  }

  private async withGallerySummary(worker: Worker, includeUnapproved = false) {
    const userId = Number(worker?.userId);
    if (!userId) return worker;

    const [gallery, completedJobs] = await Promise.all([
      this.getGalleryByUserId(userId, includeUnapproved).catch(() => []),
      this.getHistoryByUserId(userId, includeUnapproved).catch(() => []),
    ]);

    return {
      ...worker,
      avatarUrl: includeUnapproved || worker.avatarModerationStatus === 'approved'
        ? this.normalizeUploadUrl(worker.avatarUrl)
        : '',
      avatarThumbnailUrl: includeUnapproved || worker.avatarModerationStatus === 'approved'
        ? this.normalizeUploadUrl(worker.avatarThumbnailUrl)
        : '',
      gallery,
      completedJobs,
    };
  }

  private normalizeUploadUrl(value: any): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (raw.startsWith('/uploads/')) return raw;
    if (raw.startsWith('uploads/')) return `/${raw}`;
    if (raw.includes('/')) return raw.startsWith('/') ? raw : `/${raw}`;
    if (/^worker_/i.test(raw)) return `/uploads/workers/${raw}`;
    if (/^gallery_/i.test(raw)) return `/uploads/workers/gallery/${raw}`;
    return raw;
  }

  private isCompletedRequest(request: RequestEntity, userId: number): boolean {
    const status = String(request?.statusKey || request?.status || '').toLowerCase();
    return (
      Number(request?.completedByWorkerId) === Number(userId) ||
      !!request?.completedAt ||
      status.includes('зав') ||
      status.includes('СЉСЂ') ||
      status.includes('completed')
    );
  }
}

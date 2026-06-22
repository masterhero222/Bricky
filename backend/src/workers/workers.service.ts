import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { WorkerGalleryImage } from './worker-gallery-image.entity';
import { RequestEntity } from '../requests/entities/request.entity';
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
  ) {}

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
    return worker ? this.withGallerySummary(worker) : worker;
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

    const workers = await this.workerRepository.find({
      where: { userId: In(clean) },
    });
    return Promise.all(workers.map((worker) => this.withGallerySummary(worker)));
  }

  async findByIdsSmart(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const clean = ids
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (clean.length === 0) return [];

    const workers = await this.workerRepository.find({
      where: [{ id: In(clean) }, { userId: In(clean) }],
    });
    return Promise.all(workers.map((worker) => this.withGallerySummary(worker)));
  }

  async updateProfile(id: number, data: Partial<Worker>) {
    await this.workerRepository.update({ id }, data as any);
    return this.findById(id);
  }

  async updateProfileByUserId(userId: number, data: Partial<Worker>) {
    await this.workerRepository.update({ userId }, data as any);
    return this.findByUserId(userId);
  }

  async getAll() {
    const workers = await this.workerRepository.find();
    return Promise.all(workers.map((worker) => this.withGallerySummary(worker)));
  }

  // =========================
  // ✅ GALLERY
  // =========================
  async getGalleryByUserId(userId: number) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const rows = await this.galleryRepo.find({
      where: { userId: uid },
      order: { created_at: 'DESC' },
    });
    return rows.map((row) => ({
      ...row,
      url: this.normalizeUploadUrl(row.url),
    }));
  }

  async addGalleryImages(userId: number, urls: string[]) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const clean = (Array.isArray(urls) ? urls : [])
      .map((u) => String(u || '').trim())
      .filter(Boolean);

    if (clean.length === 0) throw new BadRequestException('No images');

    const rows = clean.map((url) => this.galleryRepo.create({ userId: uid, url }));
    await this.galleryRepo.save(rows);

    return this.getGalleryByUserId(uid);
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
    return { ok: true };
  }

  async getHistoryByUserId(userId: number) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const rows = await this.requestRepo.find({
      where: [{ assignedWorkerId: uid }, { completedByWorkerId: uid }],
      relations: ['client'],
      order: { completedAt: 'DESC', created_at: 'DESC' },
    });

    return rows.filter((request) => this.isCompletedRequest(request, uid));
  }

  private async withGallerySummary(worker: Worker) {
    const userId = Number(worker?.userId);
    if (!userId) return worker;

    const [gallery, completedJobs] = await Promise.all([
      this.getGalleryByUserId(userId).catch(() => []),
      this.getHistoryByUserId(userId).catch(() => []),
    ]);

    return {
      ...worker,
      avatarUrl: this.normalizeUploadUrl(worker.avatarUrl),
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
    const status = String(request?.status || '').toLowerCase();
    return (
      Number(request?.completedByWorkerId) === Number(userId) ||
      !!request?.completedAt ||
      status.includes('зав') ||
      status.includes('СЉСЂ') ||
      status.includes('completed')
    );
  }
}

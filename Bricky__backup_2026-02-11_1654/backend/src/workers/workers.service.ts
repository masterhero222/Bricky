import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { WorkerGalleryImage } from './worker-gallery-image.entity';
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
    return this.workerRepository.findOne({ where: { userId } });
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
    return worker;
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

    return this.workerRepository.find({
      where: { userId: In(clean) },
    });
  }

  async findByIdsSmart(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const clean = ids
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (clean.length === 0) return [];

    return this.workerRepository.find({
      where: [{ id: In(clean) }, { userId: In(clean) }],
    });
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
    return this.workerRepository.find();
  }

  // =========================
  // ✅ GALLERY
  // =========================
  async getGalleryByUserId(userId: number) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    return this.galleryRepo.find({
      where: { userId: uid },
      order: { created_at: 'DESC' },
    });
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
}

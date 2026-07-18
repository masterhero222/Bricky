import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { WorkerGalleryImage } from './worker-gallery-image.entity';
import { WorkerProfileEntity } from './worker-profile.entity';
import { WorkerSkillEntity } from './worker-skill.entity';
import { RequestEntity } from '../requests/entities/request.entity';
import { MediaService } from '../media/media.service';
import { ReferralRewardEntity } from '../referrals/referral-reward.entity';
import { REPAIR_CATEGORY_BY_KEY, REPAIR_CATEGORY_KEYS, RepairCategoryKey } from '../requests/repair-catalog';
import * as bcrypt from 'bcrypt';

type CreateWorkerProfileInput = {
  userId: number;
  publicName?: string;
  phone?: string;
  city?: string;
  skills?: string[];
  bio?: string | null;
  experience?: string | null;
  equipment?: string | null;
};

type WorkerMediaVisibilityOptions = {
  includeUnapprovedMedia?: boolean;
};

const SKILL_CATEGORY_ALIASES: Record<string, RepairCategoryKey> = {
  вик: 'vik',
  vik: 'vik',
  електро: 'electro',
  electro: 'electro',
  ток: 'electro',
  шпакловка: 'plaster',
  'шпакловка и боя': 'plaster',
  боя: 'painting',
  боядисване: 'painting',
  зидария: 'plaster',
  плочки: 'tiles',
};

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,

    @InjectRepository(WorkerGalleryImage)
    private readonly galleryRepo: Repository<WorkerGalleryImage>,

    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfilesRepo: Repository<WorkerProfileEntity>,

    @InjectRepository(WorkerSkillEntity)
    private readonly workerSkillsRepo: Repository<WorkerSkillEntity>,

    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,

    @InjectRepository(ReferralRewardEntity)
    private readonly referralRewardsRepo: Repository<ReferralRewardEntity>,

    private readonly media: MediaService,
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

  async findByUserId(userId: number, options: WorkerMediaVisibilityOptions = {}) {
    const profile = await this.workerProfilesRepo.findOne({ where: { userId } });
    if (profile) return this.withV2WorkerSummary(profile, options);

    const worker = await this.workerRepository.findOne({ where: { userId } });
    return worker ? this.withGallerySummary(worker, options) : worker;
  }

  /**
   * ✅ SMART LOOKUP:
   * Clients might send worker.id OR userId.
   */
  async findOneSmart(idOrUserId: number) {
    const n = Number(idOrUserId);
    if (!Number.isFinite(n) || n <= 0) throw new BadRequestException('Invalid worker identifier');

    // 1) try v2/public canonical userId
    const profile = await this.workerProfilesRepo.findOne({ where: { userId: n } });
    if (profile) return this.withV2WorkerSummary(profile);

    // 2) legacy fallback: try as userId
    let worker = await this.workerRepository.findOne({ where: { userId: n } });

    // 3) fallback: try as legacy primary key id
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

    const existing = await this.workerProfilesRepo.findOne({ where: { userId: uid } });
    if (existing) return this.withV2WorkerSummary(existing);

    const worker = this.workerProfilesRepo.create({
      userId: uid,
      publicName: data.publicName || `Майстор #${uid}`,
      city: data.city ?? null,
      bio: data.bio ?? null,
      experience: data.experience ?? null,
      equipment: data.equipment ?? null,
      approvalStatus: 'pending',
      visibilityStatus: 'private',
    });

    const saved = await this.workerProfilesRepo.save(worker);
    await this.replaceWorkerSkills(uid, data.skills ?? []);

    this.logger.log(`Worker v2 profile created for userId=${saved.userId}`);
    return this.withV2WorkerSummary(saved);
  }

  async findByUserIds(userIds: number[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const clean = userIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (clean.length === 0) return [];

    const profiles = await this.workerProfilesRepo.find({ where: { userId: In(clean) } });
    const found = new Set(profiles.map((profile) => Number(profile.userId)));
    const legacyIds = clean.filter((id) => !found.has(id));
    const legacy = legacyIds.length
      ? await this.workerRepository.find({ where: { userId: In(legacyIds) } })
      : [];

    return [
      ...(await Promise.all(profiles.map((profile) => this.withV2WorkerSummary(profile)))),
      ...(await Promise.all(legacy.map((worker) => this.withGallerySummary(worker)))),
    ];
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
    const existing = await this.workerProfilesRepo.findOne({ where: { userId } });
    const profileData: Partial<WorkerProfileEntity> = {
      publicName: (data as any).publicName || (data as any).fullName || (data as any).name,
      city: (data as any).city,
      bio: (data as any).bio || (data as any).description,
      experience: (data as any).experience,
      equipment: (data as any).equipment,
    };
    Object.keys(profileData).forEach((key) => (profileData as any)[key] === undefined && delete (profileData as any)[key]);

    if (existing) {
      await this.workerProfilesRepo.update({ userId }, profileData);
      if (Array.isArray((data as any).skills)) await this.replaceWorkerSkills(userId, (data as any).skills);
      if ((data as any).avatarUrl) await this.setAvatar(userId, (data as any).avatarUrl);
      return this.findByUserId(userId);
    }

    return this.findByUserId(userId);
  }

  async getAll(options: WorkerMediaVisibilityOptions = {}) {
    const profiles = await this.workerProfilesRepo.find({ order: { createdAt: 'DESC' } });
    const profileUserIds = new Set(profiles.map((profile) => Number(profile.userId)));
    const legacyWorkers = await this.workerRepository.find();
    const legacyOnly = legacyWorkers.filter((worker) => !profileUserIds.has(Number(worker.userId)));

    return [
      ...(await Promise.all(profiles.map((profile) => this.withV2WorkerSummary(profile, options)))),
      ...(await Promise.all(legacyOnly.map((worker) => this.withGallerySummary(worker, options)))),
    ];
  }

  // =========================
  // ✅ GALLERY
  // =========================
  async getGalleryByUserId(userId: number, options: WorkerMediaVisibilityOptions = {}) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');
    const includeUnapprovedMedia = Boolean(options.includeUnapprovedMedia);

    const [mediaRows, legacyRows] = await Promise.all([
      this.media.findByWorker(uid).catch(() => [] as any[]),
      this.galleryRepo.find({
      where: { userId: uid },
      order: { created_at: 'DESC' },
      }),
    ]);

    const galleryMedia = mediaRows
      .filter((row) => row.kind === 'worker_gallery')
      .filter((row) => includeUnapprovedMedia || row.moderationStatus === 'approved')
      .map((row) => ({
        id: row.id,
        userId: uid,
        url: this.normalizeUploadUrl(row.publicUrl),
        storageKey: row.storageKey,
        moderationStatus: row.moderationStatus,
        created_at: row.createdAt,
      }));

    const legacy = legacyRows.map((row) => ({
      ...row,
      url: this.normalizeUploadUrl(row.url),
      moderationStatus: 'approved',
    }));

    return [...galleryMedia, ...legacy];
  }

  async addGalleryImages(userId: number, urls: string[]) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const clean = (Array.isArray(urls) ? urls : [])
      .map((u) => String(u || '').trim())
      .filter(Boolean);

    if (clean.length === 0) throw new BadRequestException('No images');

    await Promise.all(
      clean.map((url) =>
        this.media.createAsset({
          ownerUserId: uid,
          workerUserId: uid,
          kind: 'worker_gallery',
          storageKey: url,
          publicUrl: url,
          moderationStatus: 'pending',
        }),
      ),
    );

    return this.getGalleryByUserId(uid, { includeUnapprovedMedia: true });
  }

  async setAvatar(userId: number, avatarUrl: string) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    await this.media.createAsset({
      ownerUserId: uid,
      workerUserId: uid,
      kind: 'worker_avatar',
      storageKey: avatarUrl,
      publicUrl: avatarUrl,
      moderationStatus: 'pending',
    });

    return this.findByUserId(uid, { includeUnapprovedMedia: true });
  }

  async deleteGalleryImage(userId: number, imageId: number) {
    const uid = Number(userId);
    const id = Number(imageId);

    if (!uid) throw new BadRequestException('Invalid userId');
    if (!id) throw new BadRequestException('Invalid imageId');

    const gallery = await this.getGalleryByUserId(uid, { includeUnapprovedMedia: true });
    const img = gallery.find((row: any) => Number(row.id) === id);
    if (!img) throw new NotFoundException('Image not found');

    await this.media.deleteAsset(id).catch(() => this.galleryRepo.delete({ id }));
    return { ok: true };
  }

  async setApprovalStatus(workerUserId: number, approvalStatus: string, visibilityStatus?: string) {
    await this.workerProfilesRepo.update(
      { userId: workerUserId },
      {
        approvalStatus,
        visibilityStatus:
          visibilityStatus || (approvalStatus === 'approved' ? 'public' : approvalStatus === 'suspended' ? 'hidden' : 'private'),
      },
    );
    return this.findByUserId(workerUserId);
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

  private async withGallerySummary(worker: Worker, options: WorkerMediaVisibilityOptions = {}) {
    const userId = Number(worker?.userId);
    if (!userId) return worker;

    const [gallery, completedJobs] = await Promise.all([
      this.getGalleryByUserId(userId, options).catch(() => []),
      this.getHistoryByUserId(userId).catch(() => []),
    ]);

    return {
      ...worker,
      avatarUrl: this.normalizeUploadUrl(worker.avatarUrl),
      gallery,
      completedJobs,
    };
  }

  private async withV2WorkerSummary(profile: WorkerProfileEntity, options: WorkerMediaVisibilityOptions = {}) {
    const userId = Number(profile.userId);
    const [skills, gallery, completedJobs, mediaRows, activeBoost] = await Promise.all([
      this.workerSkillsRepo.find({ where: { workerUserId: userId } }).catch(() => []),
      this.getGalleryByUserId(userId, options).catch(() => []),
      this.getHistoryByUserId(userId).catch(() => []),
      this.media.findByWorker(userId).catch(() => [] as any[]),
      this.referralRewardsRepo
        .findOne({
          where: {
            userId,
            rewardType: 'top_placement_30_days',
            status: 'active',
            endsAt: MoreThan(new Date()),
          },
          order: { endsAt: 'DESC' },
        })
        .catch(() => null),
    ]);

    const avatar = mediaRows.find((row) => row.kind === 'worker_avatar' && row.moderationStatus === 'approved');
    const boostApplies =
      !!activeBoost && profile.approvalStatus === 'approved' && profile.visibilityStatus !== 'hidden';

    return {
      id: userId,
      userId,
      workerUserId: userId,
      fullName: profile.publicName,
      publicName: profile.publicName,
      email: null,
      phone: null,
      city: profile.city,
      skills: skills.map((skill) => REPAIR_CATEGORY_BY_KEY[skill.categoryKey as RepairCategoryKey] || skill.activityKey || skill.categoryKey).filter(Boolean),
      skillKeys: skills.map((skill) => skill.categoryKey).filter(Boolean),
      description: profile.bio,
      bio: profile.bio,
      experience: profile.experience,
      equipment: profile.equipment,
      avatarUrl: this.normalizeUploadUrl(avatar?.publicUrl),
      isApproved: profile.approvalStatus === 'approved',
      approvalStatus: profile.approvalStatus,
      visibilityStatus: profile.visibilityStatus,
      isBoosted: boostApplies,
      boostSource: boostApplies ? 'referral' : null,
      boostEndsAt: boostApplies ? activeBoost.endsAt : null,
      gallery,
      completedJobs,
      createdAt: profile.createdAt,
    };
  }

  private async replaceWorkerSkills(workerUserId: number, skills: string[]) {
    await this.workerSkillsRepo.delete({ workerUserId });
    const clean = (Array.isArray(skills) ? skills : [])
      .map((skill) => String(skill || '').trim())
      .filter(Boolean);

    if (!clean.length) return [];

    const rows = clean.map((skill) => {
        const categoryKey = this.skillToKey(skill);
        const categoryLabel = REPAIR_CATEGORY_BY_KEY[categoryKey as RepairCategoryKey];
        const normalizedInput = String(skill || '').trim().toLowerCase();
        const isCategoryOnly =
          REPAIR_CATEGORY_KEYS.includes(skill as RepairCategoryKey) ||
          normalizedInput === String(categoryLabel || '').toLowerCase() ||
          SKILL_CATEGORY_ALIASES[normalizedInput] === categoryKey;

        return this.workerSkillsRepo.create({
          workerUserId,
          categoryKey,
          activityKey: isCategoryOnly ? null : skill,
        });
      });
    const uniqueRows = Array.from(new Map(rows.map((row) => [`${row.categoryKey}:${row.activityKey || ''}`, row])).values());

    return this.workerSkillsRepo.save(
      uniqueRows,
    );
  }

  private skillToKey(skill: string): RepairCategoryKey {
    const raw = String(skill || '').trim();
    const normalized = raw.toLowerCase();
    if (REPAIR_CATEGORY_KEYS.includes(raw as RepairCategoryKey)) return raw as RepairCategoryKey;
    if (SKILL_CATEGORY_ALIASES[normalized]) return SKILL_CATEGORY_ALIASES[normalized];

    const byLabel = Object.entries(REPAIR_CATEGORY_BY_KEY).find(([, label]) => label.toLowerCase() === normalized);
    if (byLabel) return byLabel[0] as RepairCategoryKey;

    return 'small_repairs';
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

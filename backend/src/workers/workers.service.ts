import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { Worker } from './worker.entity';
import { WorkerGalleryImage } from './worker-gallery-image.entity';
import { WorkerProfileEntity } from './worker-profile.entity';
import { WorkerSkillEntity } from './worker-skill.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { MediaService } from '../media/media.service';
import { ReferralRewardEntity } from '../referrals/referral-reward.entity';
import { REPAIR_CATEGORY_BY_KEY, REPAIR_CATEGORY_KEYS, RepairCategoryKey } from '../requests/repair-catalog';
import {
  DEFAULT_WORKER_BANNER_KEY,
  WORKER_BANNER_POLICY_BY_KEY,
  isWorkerBannerAllowed,
  resolveWorkerBannerKey,
} from './worker-banner.catalog';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UpdateWorkerOnboardingStepDto } from './dto/update-worker-onboarding-step.dto';
import { WorkerProfileCompletionService } from './worker-profile-completion.service';

type CreateWorkerProfileInput = {
  userId: number;
  publicName?: string;
  phone?: string;
  defaultAddress?: string | null;
  city?: string;
  skills?: string[];
  bio?: string | null;
  experience?: string | null;
  equipment?: string | null;
};

type WorkerMediaVisibilityOptions = {
  includeUnapprovedMedia?: boolean;
};

export type AdminWorkerFilters = {
  incomplete?: boolean;
  missingPhone?: boolean;
  onboardingIncomplete?: boolean;
  sort?: 'completion_asc' | 'newest';
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
  private readonly missingLegacyTableWarnings = new Set<string>();

  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,

    @InjectRepository(WorkerGalleryImage)
    private readonly galleryRepo: Repository<WorkerGalleryImage>,

    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfilesRepo: Repository<WorkerProfileEntity>,

    @InjectRepository(WorkerSkillEntity)
    private readonly workerSkillsRepo: Repository<WorkerSkillEntity>,

    @InjectRepository(RepairRequestEntity)
    private readonly repairRequestsRepo: Repository<RepairRequestEntity>,

    @InjectRepository(ReferralRewardEntity)
    private readonly referralRewardsRepo: Repository<ReferralRewardEntity>,

    private readonly media: MediaService,
    private readonly users: UsersService,
    private readonly profileCompletion: WorkerProfileCompletionService,
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
    return this.optionalLegacyRead(
      'worker',
      () => this.workerRepository.findOne({ where: { email } }),
      null,
    );
  }

  async findById(id: number) {
    return this.optionalLegacyRead(
      'worker',
      () => this.workerRepository.findOne({ where: { id } }),
      null,
    );
  }

  async findByUserId(userId: number, options: WorkerMediaVisibilityOptions = {}) {
    const profile = await this.workerProfilesRepo.findOne({ where: { userId } });
    if (profile) return this.withV2WorkerSummary(profile, options);

    const worker = await this.optionalLegacyRead(
      'worker',
      () => this.workerRepository.findOne({ where: { userId } }),
      null,
    );
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
    if (profile) {
      const user = await this.users.findOne(n);
      if (
        !user ||
        user.status !== 'active' ||
        profile.approvalStatus !== 'approved' ||
        profile.visibilityStatus !== 'public'
      ) {
        throw new NotFoundException('Worker not found');
      }
      return this.withV2WorkerSummary(profile);
    }

    // 2) legacy fallback: try as userId
    const worker = await this.optionalLegacyRead(
      'worker',
      async () => {
        const byUserId = await this.workerRepository.findOne({ where: { userId: n } });
        return byUserId || this.workerRepository.findOne({ where: { id: n } });
      },
      null,
    );

    if (!worker || !worker.isApproved) {
      throw new NotFoundException('Worker not found');
    }
    const user = await this.users.findOne(Number(worker.userId));
    if (!user || user.status !== 'active') {
      throw new NotFoundException('Worker not found');
    }
    return this.withGallerySummary(worker);
  }

  /**
   * NEW: Create worker profile linked to users.id (userId)
   */
  async createWorkerProfile(data: CreateWorkerProfileInput, manager?: EntityManager) {
    const uid = Number(data?.userId);
    if (!uid) throw new BadRequestException('Missing userId');

    const profilesRepo = manager?.getRepository(WorkerProfileEntity) ?? this.workerProfilesRepo;
    const existing = await profilesRepo.findOne({ where: { userId: uid } });
    if (existing) return manager ? existing : this.withV2WorkerSummary(existing);

    const worker = profilesRepo.create({
      userId: uid,
      publicName: data.publicName || `Майстор #${uid}`,
      city: data.city ?? null,
      bio: data.bio ?? null,
      experience: data.experience ?? null,
      equipment: data.equipment ?? null,
      phonePrivate: data.phone
        ? this.profileCompletion.normalizePhone(data.phone)
        : null,
      defaultAddress: data.defaultAddress ?? null,
      approvalStatus: 'pending',
      visibilityStatus: 'private',
      profileBannerKey: DEFAULT_WORKER_BANNER_KEY,
    });

    const saved = await profilesRepo.save(worker);
    await this.replaceWorkerSkills(uid, data.skills ?? [], manager);

    this.logger.log(`Worker v2 profile created for userId=${saved.userId}`);
    return manager ? saved : this.withV2WorkerSummary(saved);
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
      ? await this.optionalLegacyRead(
          'worker',
          () => this.workerRepository.find({ where: { userId: In(legacyIds) } }),
          [] as Worker[],
        )
      : [];
    const activeUsers = await this.users.findByIds([
      ...profiles.map((profile) => Number(profile.userId)),
      ...legacy.map((worker) => Number(worker.userId)),
    ]);
    const activeUserIds = new Set(
      activeUsers
        .filter((user) => user.status === 'active')
        .map((user) => Number(user.id)),
    );
    const publicProfiles = profiles.filter(
      (profile) =>
        activeUserIds.has(Number(profile.userId)) &&
        profile.approvalStatus === 'approved' &&
        profile.visibilityStatus === 'public',
    );
    const publicLegacy = legacy.filter(
      (worker) =>
        activeUserIds.has(Number(worker.userId)) &&
        Boolean(worker.isApproved),
    );

    return [
      ...(await Promise.all(
        publicProfiles.map((profile) => this.withV2WorkerSummary(profile)),
      )),
      ...(await Promise.all(
        publicLegacy.map((worker) => this.withGallerySummary(worker)),
      )),
    ];
  }

  async findByIdsSmart(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const clean = ids
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (clean.length === 0) return [];

    const workers = await this.optionalLegacyRead(
      'worker',
      () =>
        this.workerRepository.find({
          where: [{ id: In(clean) }, { userId: In(clean) }],
        }),
      [] as Worker[],
    );
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

  async updateAppearanceByUserId(userId: number, data: { profileBannerKey?: string }) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const profile = await this.workerProfilesRepo.findOne({ where: { userId: uid } });
    if (!profile) throw new NotFoundException('Worker profile not found');

    const key = String(data?.profileBannerKey || '').trim();
    if (!WORKER_BANNER_POLICY_BY_KEY[key]) throw new BadRequestException('Unknown worker banner key');

    if (!isWorkerBannerAllowed(key)) throw new BadRequestException('Unknown worker banner key');

    await this.workerProfilesRepo.update({ userId: uid }, { profileBannerKey: key });
    return { profileBannerKey: key };
  }

  async getAll(options: WorkerMediaVisibilityOptions = {}) {
    const allProfiles = await this.workerProfilesRepo.find({
      order: { createdAt: 'DESC' },
    });
    const legacyWorkers = await this.optionalLegacyRead(
      'worker',
      () => this.workerRepository.find(),
      [] as Worker[],
    );
    const activeUsers = await this.users.findByIds([
      ...allProfiles.map((profile) => Number(profile.userId)),
      ...legacyWorkers.map((worker) => Number(worker.userId)),
    ]);
    const activeUserIds = new Set(
      activeUsers
        .filter((user) => user.status === 'active')
        .map((user) => Number(user.id)),
    );
    const profiles = allProfiles.filter(
      (profile) =>
        activeUserIds.has(Number(profile.userId)) &&
        profile.approvalStatus === 'approved' &&
        profile.visibilityStatus === 'public',
    );
    const allProfileUserIds = new Set(
      allProfiles.map((profile) => Number(profile.userId)),
    );
    const legacyOnly = legacyWorkers.filter(
      (worker) =>
        activeUserIds.has(Number(worker.userId)) &&
        Boolean(worker.isApproved) &&
        !allProfileUserIds.has(Number(worker.userId)),
    );

    return [
      ...(await Promise.all(profiles.map((profile) => this.withV2WorkerSummary(profile, options)))),
      ...(await Promise.all(legacyOnly.map((worker) => this.withGallerySummary(worker, options)))),
    ];
  }

  async getAllForAdmin(filters: AdminWorkerFilters = {}) {
    const profiles = await this.workerProfilesRepo.find({ order: { createdAt: 'DESC' } });
    const users = await this.users.findByIds(profiles.map((profile) => Number(profile.userId)));
    const usersById = new Map(users.map((user) => [Number(user.id), user]));

    return Promise.all(
      profiles.map(async (profile) => {
        const summary = await this.withV2WorkerSummary(profile, { includeUnapprovedMedia: true });
        const completion = await this.getProfileCompletion(profile);
        const user = usersById.get(Number(profile.userId));
        return {
          ...summary,
          userStatus: user?.status || 'missing',
          hasPhone: this.profileCompletion.isValidPhone(profile.phonePrivate),
          completionPercent: completion.percentage,
          missingItems: completion.missingItems,
          onboardingStatus: completion.onboardingStatus,
        };
      }),
    ).then((workers) => {
      const filtered = workers.filter((worker) => {
        if (filters.incomplete && worker.completionPercent >= 100) return false;
        if (filters.missingPhone && worker.hasPhone) return false;
        if (
          filters.onboardingIncomplete &&
          worker.onboardingStatus === 'completed'
        ) {
          return false;
        }
        return true;
      });
      return filtered.sort((a, b) => {
        if (filters.sort === 'completion_asc') {
          return a.completionPercent - b.completionPercent;
        }
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
    });
  }

  async getAdminDetail(workerUserId: number) {
    const userId = Number(workerUserId);
    if (!userId) throw new BadRequestException('Invalid worker user id');
    const [profile, user] = await Promise.all([
      this.workerProfilesRepo.findOne({ where: { userId } }),
      this.users.findOne(userId),
    ]);
    if (!profile || !user) throw new NotFoundException('Worker not found');

    const [skills, completion] = await Promise.all([
      this.workerSkillsRepo.find({ where: { workerUserId: userId } }),
      this.getProfileCompletion(profile),
    ]);

    return {
      workerUserId: userId,
      publicName: profile.publicName,
      city: profile.city,
      phonePrivate: profile.phonePrivate || null,
      email: user.email || null,
      defaultAddress: profile.defaultAddress || null,
      preferredContactMethod: profile.preferredContactMethod || null,
      primaryCategoryKey:
        profile.primaryCategoryKey || skills[0]?.categoryKey || null,
      skills: skills.map((skill) => ({
        categoryKey: skill.categoryKey,
        activityKey: skill.activityKey,
      })),
      workType: profile.workType || null,
      experienceRange: profile.experienceRange || null,
      availabilityStatus: profile.availabilityStatus || null,
      acquisitionSourceSelfReported:
        profile.acquisitionSourceSelfReported || null,
      acquisitionSourceDetail: profile.acquisitionSourceDetail || null,
      projectPhotosReadiness: profile.projectPhotosReadiness || null,
      serviceDescriptionReadiness:
        profile.serviceDescriptionReadiness || null,
      onboardingStep: Number(profile.onboardingStep || 1),
      onboardingCompletedAt: profile.onboardingCompletedAt || null,
      onboardingStatus: completion.onboardingStatus,
      completionPercent: completion.percentage,
      missingItems: completion.missingItems,
      pendingModerationItems: completion.pendingModerationItems,
      accountStatus: user.status,
      approvalStatus: profile.approvalStatus,
      visibilityStatus: profile.visibilityStatus,
      createdAt: user.createdAt || profile.createdAt,
    };
  }

  async getOnboardingState(workerUserId: number) {
    const userId = Number(workerUserId);
    const profile = await this.workerProfilesRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Worker profile not found');
    const [skills, completion] = await Promise.all([
      this.workerSkillsRepo.find({ where: { workerUserId: userId } }),
      this.getProfileCompletion(profile),
    ]);

    return {
      currentStep: Number(profile.onboardingStep || 1),
      completedAt: profile.onboardingCompletedAt || null,
      contact: {
        phone: profile.phonePrivate || '',
        preferredContactMethod: profile.preferredContactMethod || '',
        contactAccuracyConfirmed: Boolean(profile.contactAccuracyConfirmed),
      },
      activity: {
        primaryCategoryKey:
          profile.primaryCategoryKey || skills[0]?.categoryKey || '',
        skills: skills.map((skill) => skill.categoryKey),
        workType: profile.workType || '',
        experienceRange: profile.experienceRange || '',
        city: profile.city || '',
        availabilityStatus: profile.availabilityStatus || '',
      },
      acquisition: {
        source: profile.acquisitionSourceSelfReported || '',
        detail: profile.acquisitionSourceDetail || '',
      },
      readiness: {
        projectPhotosReadiness: profile.projectPhotosReadiness || '',
        serviceDescriptionReadiness:
          profile.serviceDescriptionReadiness || '',
      },
      completion,
    };
  }

  async updateOnboardingStep(
    workerUserId: number,
    stepKey: string,
    data: UpdateWorkerOnboardingStepDto,
  ) {
    const userId = Number(workerUserId);
    const profile = await this.workerProfilesRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Worker profile not found');

    const update: Partial<WorkerProfileEntity> = {};
    if (stepKey === 'contact') {
      const phone = this.profileCompletion.normalizePhone(data.phone);
      if (!phone) throw new BadRequestException('Въведете валиден телефон');
      if (!data.preferredContactMethod) {
        throw new BadRequestException('Изберете предпочитан начин за контакт');
      }
      if (!data.contactAccuracyConfirmed) {
        throw new BadRequestException('Потвърдете, че данните са точни');
      }
      Object.assign(update, {
        phonePrivate: phone,
        preferredContactMethod: data.preferredContactMethod,
        contactAccuracyConfirmed: true,
        onboardingStep: Math.max(Number(profile.onboardingStep || 1), 2),
      });
    } else if (stepKey === 'activity') {
      const skills = Array.from(
        new Set(
          [data.primaryCategoryKey, ...(data.skills || [])]
            .map((value) => String(value || '').trim())
            .filter(Boolean),
        ),
      );
      if (
        !data.primaryCategoryKey ||
        !skills.length ||
        !data.workType ||
        !data.experienceRange ||
        !String(data.city || '').trim() ||
        !data.availabilityStatus
      ) {
        throw new BadRequestException('Попълнете всички полета за дейността');
      }
      Object.assign(update, {
        primaryCategoryKey: data.primaryCategoryKey,
        workType: data.workType,
        experienceRange: data.experienceRange,
        city: String(data.city).trim(),
        availabilityStatus: data.availabilityStatus,
        onboardingStep: Math.max(Number(profile.onboardingStep || 1), 3),
      });
      await this.replaceWorkerSkills(userId, skills);
    } else if (stepKey === 'acquisition') {
      const source = String(data.acquisitionSourceSelfReported || '');
      const needsDetail = ['worker_referral', 'partner', 'other'].includes(source);
      if (!source || (needsDetail && !String(data.acquisitionSourceDetail || '').trim())) {
        throw new BadRequestException('Уточнете как научихте за Bricky');
      }
      Object.assign(update, {
        acquisitionSourceSelfReported: source,
        acquisitionSourceDetail: String(data.acquisitionSourceDetail || '').trim() || null,
        onboardingStep: Math.max(Number(profile.onboardingStep || 1), 4),
      });
    } else if (stepKey === 'readiness') {
      if (!data.projectPhotosReadiness || !data.serviceDescriptionReadiness) {
        throw new BadRequestException('Попълнете готовността на профила');
      }
      Object.assign(update, {
        projectPhotosReadiness: data.projectPhotosReadiness,
        serviceDescriptionReadiness: data.serviceDescriptionReadiness,
        onboardingStep: 4,
        onboardingCompletedAt: profile.onboardingCompletedAt || new Date(),
      });
    } else {
      throw new BadRequestException('Unknown onboarding step');
    }

    await this.workerProfilesRepo.update({ userId }, update);
    return this.getOnboardingState(userId);
  }

  private async getProfileCompletion(profile: WorkerProfileEntity) {
    const userId = Number(profile.userId);
    const [skills, mediaRows] = await Promise.all([
      this.workerSkillsRepo.find({ where: { workerUserId: userId } }),
      this.media.findByWorker(userId).catch(() => [] as any[]),
    ]);
    return this.profileCompletion.calculate(profile, skills, mediaRows);
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
      this.optionalLegacyRead(
        'worker_gallery_images',
        () =>
          this.galleryRepo.find({
            where: { userId: uid },
            order: { created_at: 'DESC' },
          }),
        [] as WorkerGalleryImage[],
      ),
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
        displayOrder: row.displayOrder,
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

  async reorderPortfolioMedia(userId: number, requestId: number | null, mediaIds: number[]) {
    const uid = Number(userId);
    const orderedIds = (Array.isArray(mediaIds) ? mediaIds : []).map(Number);
    if (!uid || orderedIds.length === 0 || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('Invalid media order');
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new BadRequestException('Duplicate media ids');
    }

    let allowedRows: any[];
    if (requestId) {
      const request = await this.repairRequestsRepo.findOne({ where: { id: Number(requestId) } });
      if (!request) throw new NotFoundException('Request not found');
      if (Number(request.assignedWorkerUserId) !== uid || !request.archivedAt) {
        throw new ForbiddenException('Completed worker project required');
      }
      allowedRows = (await this.media.findByRequest(Number(requestId)))
        .filter((row) => ['request_before', 'request_after'].includes(row.kind))
        .filter((row) => row.moderationStatus === 'approved');
    } else {
      allowedRows = (await this.media.findByWorker(uid))
        .filter((row) => row.kind === 'worker_gallery');
    }

    const allowedIds = allowedRows.map((row) => Number(row.id));
    if (
      orderedIds.length !== allowedIds.length ||
      orderedIds.some((id) => !allowedIds.includes(id))
    ) {
      throw new ForbiddenException('Media order does not match this portfolio album');
    }

    await this.media.setDisplayOrder(orderedIds);
    return { ok: true, mediaIds: orderedIds };
  }

  async setApprovalStatus(
    workerUserId: number,
    approvalStatus: string,
    visibilityStatus?: string,
    manager?: EntityManager,
  ) {
    const profilesRepo = manager?.getRepository(WorkerProfileEntity) ?? this.workerProfilesRepo;
    const profile = await profilesRepo.findOne({ where: { userId: workerUserId } });
    if (!profile) throw new NotFoundException('Worker profile not found');
    const nextVisibility = visibilityStatus || (
      approvalStatus === 'suspended'
        ? 'hidden'
        : approvalStatus === 'approved'
          ? profile.visibilityStatus === 'hidden' ? 'private' : profile.visibilityStatus
          : 'private'
    );
    await profilesRepo.update(
      { userId: workerUserId },
      {
        approvalStatus,
        visibilityStatus: nextVisibility,
      },
    );
    if (manager) return profilesRepo.findOne({ where: { userId: workerUserId } });
    return this.findByUserId(workerUserId);
  }

  async setWallVisibility(workerUserId: number, listed: boolean, manager?: EntityManager) {
    const profilesRepo = manager?.getRepository(WorkerProfileEntity) ?? this.workerProfilesRepo;
    const profile = await profilesRepo.findOne({ where: { userId: workerUserId } });
    if (!profile) throw new NotFoundException('Worker profile not found');
    if (listed && profile.approvalStatus !== 'approved') {
      throw new BadRequestException('Approve the worker before adding them to the public wall');
    }

    profile.visibilityStatus = listed ? 'public' : 'private';
    const saved = await profilesRepo.save(profile);
    return manager ? saved : this.findByUserId(workerUserId, { includeUnapprovedMedia: true });
  }

  async getHistoryByUserId(userId: number) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');

    const rows = await this.repairRequestsRepo.find({
      where: {
        assignedWorkerUserId: uid,
        status: 'completed',
        archivedAt: Not(IsNull()),
      },
      relations: ['client'],
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });

    return Promise.all(
      rows.map(async (request) => {
        const mediaRows = await this.media.findByRequest(request.id).catch(() => [] as any[]);
        const approved = mediaRows.filter((row) => row.moderationStatus === 'approved');
        const toPhotos = (kind: string) =>
          approved
            .filter((row) => row.kind === kind)
            .map((row) => ({
              id: row.id,
              name: `media-${row.id}`,
              url: this.normalizeUploadUrl(row.publicUrl),
              storageKey: row.storageKey,
              moderationStatus: row.moderationStatus,
              displayOrder: row.displayOrder,
              created_at: row.createdAt,
            }));

        const portfolioPhotos = approved
          .filter((row) => ['request_before', 'request_after'].includes(row.kind))
          .map((row) => ({
            id: row.id,
            name: `media-${row.id}`,
            url: this.normalizeUploadUrl(row.publicUrl),
            storageKey: row.storageKey,
            moderationStatus: row.moderationStatus,
            displayOrder: row.displayOrder,
            created_at: row.createdAt,
          }));

        return {
          id: request.id,
          requestId: request.id,
          category: REPAIR_CATEGORY_BY_KEY[request.categoryKey as RepairCategoryKey] || request.categoryKey,
          categoryKey: request.categoryKey,
          address: request.addressVisibility === 'rough_area' ? request.addressText : null,
          description: request.description,
          startedAt: request.createdAt,
          completedAt: request.completedAt,
          durationDays: this.completionDurationDays(request.createdAt, request.completedAt),
          beforePhotos: toPhotos('request_before'),
          afterPhotos: toPhotos('request_after'),
          portfolioPhotos,
          created_at: request.createdAt,
        };
      }),
    );
  }

  private async withGallerySummary(worker: Worker, options: WorkerMediaVisibilityOptions = {}) {
    const userId = Number(worker?.userId);
    if (!userId) return worker;

    const [gallery, completedJobs, mediaRows] = await Promise.all([
      this.getGalleryByUserId(userId, options).catch(() => []),
      this.getHistoryByUserId(userId).catch(() => []),
      this.media.findByWorker(userId).catch(() => [] as any[]),
    ]);
    const avatar = mediaRows
      .filter((row) => row.kind === 'worker_avatar')
      .filter((row) => options.includeUnapprovedMedia || row.moderationStatus === 'approved')
      .filter((row) => row.moderationStatus !== 'rejected')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    const publicWorker = this.withoutPrivateWorkerFields(worker);

    return {
      ...publicWorker,
      avatarUrl: this.normalizeUploadUrl(avatar?.publicUrl || worker.avatarUrl),
      avatarModerationStatus: avatar?.moderationStatus || 'approved',
      profileBannerKey: DEFAULT_WORKER_BANNER_KEY,
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

    const avatar = mediaRows
      .filter((row) => row.kind === 'worker_avatar')
      .filter((row) => options.includeUnapprovedMedia || row.moderationStatus === 'approved')
      .filter((row) => row.moderationStatus !== 'rejected')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    const boostApplies =
      !!activeBoost && profile.approvalStatus === 'approved' && profile.visibilityStatus !== 'hidden';

    return {
      id: userId,
      userId,
      workerUserId: userId,
      fullName: profile.publicName,
      publicName: profile.publicName,
      city: profile.city,
      skills: skills.map((skill) => REPAIR_CATEGORY_BY_KEY[skill.categoryKey as RepairCategoryKey] || skill.activityKey || skill.categoryKey).filter(Boolean),
      skillKeys: skills.map((skill) => skill.categoryKey).filter(Boolean),
      description: profile.bio,
      bio: profile.bio,
      experience: profile.experience,
      equipment: profile.equipment,
      profileBannerKey: resolveWorkerBannerKey(profile.profileBannerKey),
      avatarUrl: this.normalizeUploadUrl(avatar?.publicUrl),
      avatarModerationStatus: avatar?.moderationStatus || null,
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

  private withoutPrivateWorkerFields(
    worker: Worker,
  ): Record<string, unknown> & Pick<Worker, 'id' | 'userId'> {
    const publicWorker: Record<string, unknown> &
      Pick<Worker, 'id' | 'userId'> = { ...worker };
    for (const key of [
      'email',
      'phone',
      'phonePrivate',
      'password',
      'passwordHash',
      'password_hash',
      'accessToken',
      'refreshToken',
    ]) {
      delete publicWorker[key];
    }
    return publicWorker;
  }

  private async replaceWorkerSkills(workerUserId: number, skills: string[], manager?: EntityManager) {
    const skillsRepo = manager?.getRepository(WorkerSkillEntity) ?? this.workerSkillsRepo;
    await skillsRepo.delete({ workerUserId });
    const clean = (Array.isArray(skills) ? skills : [])
      .map((skill) => String(skill || '').trim())
      .filter(Boolean);

    if (!clean.length) {
      await this.resetIneligibleWorkerBanner(workerUserId, manager);
      return [];
    }

    const rows = clean.map((skill) => {
        const categoryKey = this.skillToKey(skill);
        const categoryLabel = REPAIR_CATEGORY_BY_KEY[categoryKey as RepairCategoryKey];
        const normalizedInput = String(skill || '').trim().toLowerCase();
        const isCategoryOnly =
          REPAIR_CATEGORY_KEYS.includes(skill as RepairCategoryKey) ||
          normalizedInput === String(categoryLabel || '').toLowerCase() ||
          SKILL_CATEGORY_ALIASES[normalizedInput] === categoryKey;

        return skillsRepo.create({
          workerUserId,
          categoryKey,
          activityKey: isCategoryOnly ? null : skill,
        });
      });
    const uniqueRows = Array.from(new Map(rows.map((row) => [`${row.categoryKey}:${row.activityKey || ''}`, row])).values());

    const saved = await skillsRepo.save(uniqueRows);
    await this.resetIneligibleWorkerBanner(workerUserId, manager);
    return saved;
  }

  private async resetIneligibleWorkerBanner(workerUserId: number, manager?: EntityManager) {
    const profilesRepo = manager?.getRepository(WorkerProfileEntity) ?? this.workerProfilesRepo;
    const profile = await profilesRepo.findOne({ where: { userId: workerUserId } });
    if (!profile) return;

    const currentKey = resolveWorkerBannerKey(profile.profileBannerKey);
    if (isWorkerBannerAllowed(currentKey)) return;

    await profilesRepo.update({ userId: workerUserId }, { profileBannerKey: DEFAULT_WORKER_BANNER_KEY });
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

  private async optionalLegacyRead<T>(
    tableName: string,
    operation: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (!this.isMissingLegacyTableError(error)) throw error;

      if (!this.missingLegacyTableWarnings.has(tableName)) {
        this.missingLegacyTableWarnings.add(tableName);
        this.logger.warn(`Legacy table "${tableName}" is unavailable; continuing with the v2 data model`);
      }
      return fallback;
    }
  }

  private isMissingLegacyTableError(error: unknown): boolean {
    const candidate = error as {
      code?: string;
      errno?: number;
      driverError?: { code?: string; errno?: number };
    };
    return (
      candidate?.code === 'ER_NO_SUCH_TABLE' ||
      candidate?.errno === 1146 ||
      candidate?.driverError?.code === 'ER_NO_SUCH_TABLE' ||
      candidate?.driverError?.errno === 1146
    );
  }

  private completionDurationDays(startedAt: Date, completedAt: Date | null): number {
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt || startedAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
    return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
  }

}

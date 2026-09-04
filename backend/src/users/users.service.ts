// src/users/users.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './user.entity';
import { ClientProfileEntity } from './client-profile.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { NotificationEntity } from '../notifications/notification.entity';
import { WorkerPlanEntity } from '../billing/worker-plan.entity';
import { UpdateAccountProfileDto } from './dto/update-account-profile.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { RequestApplicationEntity } from '../requests/entities/request-application.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { normalizeWorkerPhone } from '../workers/worker-profile-completion.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    @InjectRepository(ClientProfileEntity)
    private readonly clientProfilesRepo: Repository<ClientProfileEntity>,
    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfilesRepo: Repository<WorkerProfileEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepo: Repository<NotificationEntity>,
    @InjectRepository(WorkerPlanEntity)
    private readonly workerPlansRepo: Repository<WorkerPlanEntity>,
  ) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: number[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findClientProfile(userId: number) {
    const profile = await this.clientProfilesRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (profile) return profile;

    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user || user.role !== 'client') return null;

    return {
      userId: user.id,
      user,
      displayName: user.name,
      phonePrivate: null,
      defaultAddress: null,
    } as ClientProfileEntity;
  }

  async create(
    data: { name: string; email: string; password: string; role: string },
    manager?: EntityManager,
  ) {
    const repo = manager?.getRepository(UserEntity) ?? this.repo;
    const user = repo.create({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordHash: data.password,
      role: data.role,
      status: 'active',
    });

    return repo.save(user);
  }

  async createClientProfile(
    data: {
      userId: number;
      displayName: string;
      phonePrivate?: string | null;
      defaultAddress?: string | null;
    },
    manager?: EntityManager,
  ) {
    const repo =
      manager?.getRepository(ClientProfileEntity) ?? this.clientProfilesRepo;
    const profile = repo.create({
      userId: data.userId,
      displayName: data.displayName,
      phonePrivate: data.phonePrivate ?? null,
      defaultAddress: data.defaultAddress ?? null,
    });

    return repo.save(profile);
  }

  async updateStatus(userId: number, status: string, manager?: EntityManager) {
    const repo = manager?.getRepository(UserEntity) ?? this.repo;
    await repo.update({ id: userId }, { status });
    return repo.findOne({ where: { id: userId } });
  }

  async searchUsers(query = '') {
    const qb = this.repo
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC')
      .take(100);
    const q = query.trim();
    if (q) {
      qb.where('user.email LIKE :q OR user.name LIKE :q', { q: `%${q}%` });
    }
    return qb.getMany();
  }

  async getAccount(userId: number) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');

    const [
      clientProfile,
      workerProfile,
      notifications,
      unreadCount,
      workerPlan,
    ] = await Promise.all([
      user.role === 'client'
        ? this.clientProfilesRepo.findOne({ where: { userId } })
        : Promise.resolve(null),
      user.role === 'worker'
        ? this.workerProfilesRepo.findOne({ where: { userId } })
        : Promise.resolve(null),
      this.notificationsRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.notificationsRepo.count({ where: { userId, isRead: false } }),
      user.role === 'worker'
        ? this.workerPlansRepo.findOne({ where: { workerUserId: userId } })
        : Promise.resolve(null),
    ]);

    const profile = clientProfile
      ? {
          name: clientProfile.displayName,
          phone: clientProfile.phonePrivate,
          address: clientProfile.defaultAddress,
        }
      : workerProfile
        ? {
            name: workerProfile.publicName,
            phone: workerProfile.phonePrivate,
            address: workerProfile.defaultAddress,
            city: workerProfile.city,
          }
        : { name: user.name, phone: null, address: null };

    return {
      userId: user.id,
      role: user.role,
      status: user.status,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerificationMode:
        process.env.EMAIL_VERIFICATION_MODE === 'required'
          ? 'required'
          : 'transitional',
      profile,
      subscription:
        user.role === 'worker'
          ? {
              planKey: workerPlan?.planKey || 'free',
              status: workerPlan?.status || 'active',
              startsAt: workerPlan?.startsAt || null,
              endsAt: workerPlan?.endsAt || null,
            }
          : null,
      notifications: {
        unreadCount,
        items: notifications,
      },
    };
  }

  async updateAccountProfile(userId: number, data: UpdateAccountProfileDto) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');

    const email = data.email?.trim().toLowerCase();
    const emailChanged = Boolean(email && email !== user.email.toLowerCase());
    if (emailChanged) {
      const duplicate = await this.repo.findOne({ where: { email } });
      if (duplicate && duplicate.id !== userId) {
        throw new BadRequestException('Имейлът вече се използва');
      }
    }

    await this.repo.manager.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const name = data.name?.trim();
      await users.update(
        { id: userId },
        {
          ...(emailChanged ? { email, emailVerifiedAt: null } : {}),
          ...(name ? { name } : {}),
        },
      );

      if (user.role === 'client') {
        const profiles = manager.getRepository(ClientProfileEntity);
        const profile =
          (await profiles.findOne({ where: { userId } })) ||
          profiles.create({
            userId,
            displayName: name || user.name,
            phonePrivate: null,
            defaultAddress: null,
          });
        if (name) profile.displayName = name;
        if (data.phone !== undefined)
          profile.phonePrivate = this.normalizePhone(data.phone);
        if (data.address !== undefined)
          profile.defaultAddress = this.cleanOptional(data.address);
        await profiles.save(profile);
      } else if (user.role === 'worker') {
        const profiles = manager.getRepository(WorkerProfileEntity);
        const profile = await profiles.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Worker profile not found');
        if (name) profile.publicName = name;
        if (data.phone !== undefined)
          profile.phonePrivate = this.normalizePhone(data.phone);
        if (data.address !== undefined)
          profile.defaultAddress = this.cleanOptional(data.address);
        await profiles.save(profile);
      }
    });

    return this.getAccount(userId);
  }

  async exportAccountData(userId: number) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');

    const manager = this.repo.manager;
    const requestRepo = manager.getRepository(RepairRequestEntity);
    const applicationRepo = manager.getRepository(RequestApplicationEntity);
    const reviewRepo = manager.getRepository(ReviewEntity);
    const mediaRepo = manager.getRepository(MediaAssetEntity);

    const [account, requests, applications, reviews, media, notifications] =
      await Promise.all([
        this.getAccount(userId),
        requestRepo.find({
          where: [{ clientUserId: userId }, { assignedWorkerUserId: userId }],
          order: { createdAt: 'DESC' },
        }),
        applicationRepo.find({
          where: { workerUserId: userId },
          order: { created_at: 'DESC' },
        }),
        reviewRepo.find({
          where: [{ clientUserId: userId }, { workerUserId: userId }],
          order: { created_at: 'DESC' },
        }),
        mediaRepo.find({
          where: { ownerUserId: userId },
          order: { createdAt: 'DESC' },
        }),
        this.notificationsRepo.find({
          where: { userId },
          order: { createdAt: 'DESC' },
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      account,
      requests,
      applications,
      reviews,
      media: media.map((asset) => ({
        id: asset.id,
        requestId: asset.requestId,
        workerUserId: asset.workerUserId,
        kind: asset.kind,
        publicUrl: asset.publicUrl,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        moderationStatus: asset.moderationStatus,
        createdAt: asset.createdAt,
      })),
      notifications,
    };
  }

  async deactivateAccount(userId: number, data: DeactivateAccountDto) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');

    const validPassword = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash || user.password,
    );
    if (!validPassword) {
      throw new ForbiddenException('Текущата парола е грешна');
    }

    const requestRepo = this.repo.manager.getRepository(RepairRequestEntity);
    const activeRequestCount = await requestRepo.count({
      where: [
        {
          clientUserId: userId,
          status: Not(In(['completed', 'canceled', 'archived'])),
        },
        {
          assignedWorkerUserId: userId,
          status: Not(In(['completed', 'canceled', 'archived'])),
        },
      ],
    });
    if (activeRequestCount > 0) {
      throw new BadRequestException(
        'Профилът не може да бъде деактивиран, докато има активна поръчка',
      );
    }

    await this.repo.manager.transaction(async (manager) => {
      await manager.getRepository(UserEntity).update(
        { id: userId },
        {
          status: 'deleted',
          authVersion: Number(user.authVersion || 0) + 1,
        },
      );

      if (user.role === 'worker') {
        await manager
          .getRepository(WorkerProfileEntity)
          .update({ userId }, { visibilityStatus: 'private' });
      }
    });

    return {
      deactivated: true,
      message: 'Профилът е деактивиран',
    };
  }

  private cleanOptional(value: string | null) {
    const clean = String(value || '').trim();
    return clean || null;
  }

  private normalizePhone(value: string | null) {
    const clean = String(value || '').trim();
    if (!clean) return null;
    const normalized = normalizeWorkerPhone(clean);
    if (!normalized) {
      throw new BadRequestException('Въведете валиден телефон');
    }
    return normalized;
  }
}

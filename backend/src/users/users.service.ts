// src/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { ClientProfileEntity } from './client-profile.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { NotificationEntity } from '../notifications/notification.entity';
import { WorkerPlanEntity } from '../billing/worker-plan.entity';
import { UpdateAccountProfileDto } from './dto/update-account-profile.dto';

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

  findClientProfile(userId: number) {
    return this.clientProfilesRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
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
    const repo = manager?.getRepository(ClientProfileEntity) ?? this.clientProfilesRepo;
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
    const qb = this.repo.createQueryBuilder('user').orderBy('user.created_at', 'DESC').take(100);
    const q = query.trim();
    if (q) {
      qb.where('user.email LIKE :q OR user.name LIKE :q', { q: `%${q}%` });
    }
    return qb.getMany();
  }

  async getAccount(userId: number) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');

    const [clientProfile, workerProfile, notifications, unreadCount, workerPlan] = await Promise.all([
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
    if (email && email !== user.email.toLowerCase()) {
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
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
        },
      );

      if (user.role === 'client') {
        const profiles = manager.getRepository(ClientProfileEntity);
        const profile = await profiles.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Client profile not found');
        if (name) profile.displayName = name;
        if (data.phone !== undefined) profile.phonePrivate = this.cleanOptional(data.phone);
        if (data.address !== undefined) profile.defaultAddress = this.cleanOptional(data.address);
        await profiles.save(profile);
      } else if (user.role === 'worker') {
        const profiles = manager.getRepository(WorkerProfileEntity);
        const profile = await profiles.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Worker profile not found');
        if (name) profile.publicName = name;
        if (data.phone !== undefined) profile.phonePrivate = this.cleanOptional(data.phone);
        if (data.address !== undefined) profile.defaultAddress = this.cleanOptional(data.address);
        await profiles.save(profile);
      }
    });

    return this.getAccount(userId);
  }

  private cleanOptional(value: string | null) {
    const clean = String(value || '').trim();
    return clean || null;
  }
}

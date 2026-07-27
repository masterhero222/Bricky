// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { ClientProfileEntity } from './client-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    @InjectRepository(ClientProfileEntity)
    private readonly clientProfilesRepo: Repository<ClientProfileEntity>,
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

  async updateStatus(userId: number, status: string) {
    await this.repo.update({ id: userId }, { status });
    return this.findOne(userId);
  }

  async searchUsers(query = '') {
    const qb = this.repo.createQueryBuilder('user').orderBy('user.created_at', 'DESC').take(100);
    const q = query.trim();
    if (q) {
      qb.where('user.email LIKE :q OR user.name LIKE :q', { q: `%${q}%` });
    }
    return qb.getMany();
  }
}

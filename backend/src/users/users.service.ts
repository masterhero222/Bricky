// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: { name: string; email: string; password: string; role: string }) {
    const user = this.repo.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    return this.repo.save(user);
  }

  async markEmailVerified(id: number) {
    await this.repo.update(id, {
      emailVerifiedAt: new Date(),
      emailVerificationRequired: false,
    });
    return this.findOne(id);
  }

  async updatePasswordAndRevokeSessions(id: number, passwordHash: string) {
    await this.repo
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        password: passwordHash,
        passwordChangedAt: new Date(),
        tokenVersion: () => 'tokenVersion + 1',
      })
      .where('id = :id', { id })
      .execute();
    return this.findOne(id);
  }

  async revokeSessions(id: number) {
    await this.repo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ tokenVersion: () => 'tokenVersion + 1' })
      .where('id = :id', { id })
      .execute();
    return this.findOne(id);
  }
}

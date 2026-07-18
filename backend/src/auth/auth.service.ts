import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workers: WorkersService,
    private readonly jwt: JwtService,
    private readonly referrals: ReferralsService,
  ) {}

  async register(dto: RegisterUserDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new BadRequestException('Имейлът вече съществува');

    const profile = dto.profile || {};
    if (dto.referralCode) await this.referrals.validateCode(dto.referralCode, dto.role);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // CLIENT
    if (dto.role === 'client') {
      const displayName = String(profile.displayName || dto.name || '').trim();
      if (!displayName) throw new BadRequestException('Името е задължително');

      const user = await this.users.create({
        name: displayName,
        email: dto.email,
        password: passwordHash,
        role: 'client',
      });

      await this.users.createClientProfile({
        userId: user.id,
        displayName,
        phonePrivate: profile.phonePrivate || dto.phone || null,
        defaultAddress: profile.defaultAddress || null,
      });
      await this.referrals.attachRegistration(dto.referralCode, user.id, 'client');

      return { message: 'Клиентът е регистриран успешно', user };
    }

    // WORKER
    if (dto.role === 'worker') {
      const publicName = String(profile.publicName || dto.fullName || '').trim();
      const city = String(profile.city || dto.city || '').trim();
      const skills = Array.isArray(profile.skills) ? profile.skills : dto.skills ?? [];

      if (!publicName) throw new BadRequestException('Трите имена са задължителни');
      if (!city) throw new BadRequestException('Градът е задължителен');

      const user = await this.users.create({
        name: publicName,
        email: dto.email,
        password: passwordHash,
        role: 'worker',
      });

      await this.workers.createWorkerProfile({
        userId: user.id,
        publicName,
        city,
        skills,
        bio: profile.bio || profile.description || null,
        experience: profile.experience || null,
        equipment: profile.equipment || null,
      });
      await this.referrals.attachRegistration(dto.referralCode, user.id, 'worker');

      return { message: 'Майсторът е регистриран успешно', user };
    }

    throw new BadRequestException('Невалидна роля');
  }


  async devLogin(role: 'client' | 'worker') {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Dev login is disabled in production');
    }

    const safeRole = role === 'worker' ? 'worker' : 'client';
    const user = {
      id: safeRole === 'client' ? 1 : 2,
      role: safeRole,
      name: safeRole === 'client' ? 'Dev Client' : 'Dev Worker',
      email: safeRole === 'client' ? 'client.dev@bricky.local' : 'worker.dev@bricky.local',
    };

    const token = await this.jwt.signAsync({
      id: user.id,
      role: user.role,
    });

    return { token, user };
  }
  async login(dto: LoginUserDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Грешен имейл или парола');

    const valid = await bcrypt.compare(dto.password, user.passwordHash || user.password);
    if (!valid) throw new BadRequestException('Грешни данни');

    const token = await this.jwt.signAsync({
      id: user.id,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    };
  }
}


import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ReferralsService } from '../referrals/referrals.service';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { PasswordResetTokenEntity } from './password-reset-token.entity';
import { UserEntity } from '../users/user.entity';

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_RESPONSE = {
  message: 'Ако имейлът е регистриран, ще получите защитен линк за смяна на паролата.',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workers: WorkersService,
    private readonly jwt: JwtService,
    private readonly referrals: ReferralsService,
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokens: Repository<PasswordResetTokenEntity>,
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

      const user = await this.dataSource.transaction(async (manager) => {
        const created = await this.users.create(
          {
            name: displayName,
            email: dto.email,
            password: passwordHash,
            role: 'client',
          },
          manager,
        );

        await this.users.createClientProfile(
          {
            userId: created.id,
            displayName,
            phonePrivate: profile.phonePrivate || dto.phone || null,
            defaultAddress: profile.defaultAddress || null,
          },
          manager,
        );
        await this.referrals.attachRegistration(dto.referralCode, created.id, 'client', manager);
        return created;
      });

      return { message: 'Клиентът е регистриран успешно', user };
    }

    // WORKER
    if (dto.role === 'worker') {
      const publicName = String(profile.publicName || dto.fullName || '').trim();
      const city = String(profile.city || dto.city || '').trim();
      const skills = Array.isArray(profile.skills) ? profile.skills : dto.skills ?? [];

      if (!publicName) throw new BadRequestException('Трите имена са задължителни');
      if (!city) throw new BadRequestException('Градът е задължителен');

      const user = await this.dataSource.transaction(async (manager) => {
        const created = await this.users.create(
          {
            name: publicName,
            email: dto.email,
            password: passwordHash,
            role: 'worker',
          },
          manager,
        );

        await this.workers.createWorkerProfile(
          {
            userId: created.id,
            publicName,
            phone: profile.phonePrivate || dto.phone || null,
            defaultAddress: profile.defaultAddress || null,
            city,
            skills,
            bio: profile.bio || profile.description || null,
            experience: profile.experience || null,
            equipment: profile.equipment || null,
          },
          manager,
        );
        await this.referrals.attachRegistration(dto.referralCode, created.id, 'worker', manager);
        return created;
      });

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
      authVersion: 0,
    };

    const token = await this.jwt.signAsync({
      id: user.id,
      role: user.role,
      authVersion: user.authVersion || 0,
    });

    return { token, user };
  }
  async login(dto: LoginUserDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Грешен имейл или парола');
    if (user.status !== 'active') {
      throw new BadRequestException('Акаунтът е временно спрян');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash || user.password);
    if (!valid) throw new BadRequestException('Грешни данни');

    const token = await this.jwt.signAsync({
      id: user.id,
      role: user.role,
      authVersion: user.authVersion || 0,
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

  async requestPasswordReset(emailInput: string) {
    const email = String(emailInput || '').trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || ['deleted', 'blocked'].includes(user.status)) {
      return PASSWORD_RESET_RESPONSE;
    }

    const latest = await this.passwordResetTokens.findOne({
      where: { userId: user.id, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (latest && Date.now() - new Date(latest.createdAt).getTime() < 60_000) {
      return PASSWORD_RESET_RESPONSE;
    }

    const now = new Date();
    await this.passwordResetTokens.update(
      { userId: user.id, consumedAt: IsNull() },
      { consumedAt: now },
    );

    const token = randomBytes(32).toString('hex');
    await this.passwordResetTokens.save(
      this.passwordResetTokens.create({
        userId: user.id,
        tokenHash: this.hashResetToken(token),
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        consumedAt: null,
      }),
    );

    const appUrl = String(process.env.PUBLIC_APP_URL || 'https://bricky.bg').replace(/\/$/, '');
    await this.mail.sendPasswordResetLink({
      email: user.email,
      name: user.name,
      resetUrl: `${appUrl}/reset-password?token=${encodeURIComponent(token)}`,
    });

    return PASSWORD_RESET_RESPONSE;
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = this.hashResetToken(String(rawToken || ''));

    await this.dataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(PasswordResetTokenEntity);
      const userRepo = manager.getRepository(UserEntity);
      const resetToken = await tokenRepo.findOne({
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      const now = new Date();

      if (
        !resetToken ||
        resetToken.consumedAt ||
        new Date(resetToken.expiresAt).getTime() <= now.getTime()
      ) {
        throw new BadRequestException('Линкът е невалиден или е изтекъл');
      }

      const user = await userRepo.findOne({ where: { id: resetToken.userId } });
      if (!user || ['deleted', 'blocked'].includes(user.status)) {
        throw new BadRequestException('Линкът е невалиден или е изтекъл');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await userRepo.update(
        { id: user.id },
        { password: passwordHash, passwordHash },
      );
      await userRepo.increment({ id: user.id }, 'authVersion', 1);
      await tokenRepo.update(
        { userId: user.id, consumedAt: IsNull() },
        { consumedAt: now },
      );
    });

    return { ok: true, message: 'Паролата е сменена успешно.' };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}


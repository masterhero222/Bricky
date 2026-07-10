import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { AccountSecurityService } from '../account-security/account-security.service';
import { MailService } from '../mail/mail.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workers: WorkersService,
    private readonly accountSecurity: AccountSecurityService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterUserDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new BadRequestException('Имейлът вече съществува');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // CLIENT
    if (dto.role === 'client') {
      if (!dto.name) throw new BadRequestException('Името е задължително');

      const user = await this.users.create({
        name: dto.name,
        email: dto.email,
        password: passwordHash,
        role: 'client',
      });

      await this.sendVerificationEmail(user);

      return { message: 'Клиентът е регистриран успешно. Провери имейла си за потвърждение.', user };
    }

    // WORKER
    if (dto.role === 'worker') {
      if (!dto.fullName) throw new BadRequestException('Трите имена са задължителни');
      if (!dto.phone) throw new BadRequestException('Телефонът е задължителен');
      if (!dto.city) throw new BadRequestException('Градът е задължителен');

      const user = await this.users.create({
        name: dto.fullName,
        email: dto.email,
        password: passwordHash,
        role: 'worker',
      });

      await this.workers.createWorkerProfile({
        userId: user.id,
        phone: dto.phone,
        city: dto.city,
        skills: dto.skills ?? [],
      });

      await this.sendVerificationEmail(user);

      return { message: 'Майсторът е регистриран успешно. Провери имейла си за потвърждение.', user };
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
      tokenVersion: 0,
    });

    return { token, user };
  }
  async login(dto: LoginUserDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Грешен имейл или парола');
    if (user.accountStatus === 'suspended') throw new BadRequestException('Акаунтът е временно спрян');
    if (user.emailVerificationRequired && !user.emailVerifiedAt) {
      throw new BadRequestException('Имейлът не е потвърден. Провери пощата си или изпрати нов линк за потвърждение.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new BadRequestException('Грешни данни');

    const token = await this.jwt.signAsync({
      id: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
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

  async verifyEmail(rawToken: string) {
    const token = await this.accountSecurity.consumeToken(rawToken, 'email_verification');
    const user = await this.users.markEmailVerified(token.userId);
    return {
      message: 'Имейлът е потвърден успешно',
      user: user ? this.safeUser(user) : null,
    };
  }

  async resendVerification(email: string) {
    const user = await this.users.findByEmail(email);
    if (user && user.emailVerificationRequired && !user.emailVerifiedAt) {
      await this.sendVerificationEmail(user);
    }
    return { message: 'Ако има акаунт с този имейл, ще получиш инструкции.' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.findByEmail(email);
    if (user && user.accountStatus !== 'suspended') {
      const { rawToken } = await this.accountSecurity.issueToken(user.id, 'password_reset', 60);
      const status = await this.mail.sendPasswordReset({ email: user.email, name: user.name, token: rawToken });
      await this.accountSecurity.logEmailDelivery({
        userId: user.id,
        email: user.email,
        type: 'password_reset',
        status,
        provider: 'mailer',
      });
    }
    return { message: 'Ако има акаунт с този имейл, ще получиш инструкции.' };
  }

  async resetPassword(rawToken: string, password: string) {
    const token = await this.accountSecurity.consumeToken(rawToken, 'password_reset');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.users.updatePasswordAndRevokeSessions(token.userId, passwordHash);
    if (user) {
      const status = await this.mail.sendPasswordChanged({ email: user.email, name: user.name });
      await this.accountSecurity.logEmailDelivery({
        userId: user.id,
        email: user.email,
        type: 'password_changed',
        status,
        provider: 'mailer',
      });
    }
    return { message: 'Паролата е сменена успешно' };
  }

  private async sendVerificationEmail(user: { id: number; email: string; name?: string }) {
    const { rawToken } = await this.accountSecurity.issueToken(user.id, 'email_verification', 24 * 60);
    const status = await this.mail.sendEmailVerification({ email: user.email, name: user.name, token: rawToken });
    await this.accountSecurity.logEmailDelivery({
      userId: user.id,
      email: user.email,
      type: 'email_verification',
      status,
      provider: 'mailer',
    });
  }

  private safeUser(user: { id: number; role: string; name: string; email: string; emailVerifiedAt?: Date | null }) {
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
    };
  }
}


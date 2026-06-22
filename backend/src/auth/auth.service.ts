import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workers: WorkersService,
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

      return { message: 'Клиентът е регистриран успешно', user };
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

    const valid = await bcrypt.compare(dto.password, user.password);
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


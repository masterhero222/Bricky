// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { Worker } from '../workers/worker.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workers: WorkersService,
    private readonly jwt: JwtService,
  ) {}

  // ------------------------------------------------------
  //  REGISTER CLIENT
  // ------------------------------------------------------
  async register(dto: RegisterUserDto) {
    const email = dto.email.toLowerCase();

    const exists = await this.users.findByEmail(email);
    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.users.create({
      name: dto.name,
      email,
      password: hashed,
      role: 'client',
    });

    const { password, ...rest } = user;
    return rest;
  }

  // ------------------------------------------------------
  //  LOGIN (CLIENT OR WORKER)
  // ------------------------------------------------------
  async login(dto: LoginUserDto) {
    const email = dto.email.toLowerCase();

    // 1) check in users table
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2) validate password
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3) worker profile (optional)
    let workerProfile: Worker | null = null;
    if (user.role === 'worker') {
      workerProfile = await this.workers.findByEmail(email);
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      workerId: workerProfile ? workerProfile.id : null,
    };

    const token = this.jwt.sign(payload);

    return {
      message: 'Login successful',
      token,
      user: payload,
    };
  }
}

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService } from './auth.service';
import { CompatibleRegisterUserDto } from './dto/compatible-register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: AuthRateLimitService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterUserDto, @Req() request: Request) {
    this.limit(request, 'register', 5, 60 * 60_000);
    return this.auth.register(dto);
  }

  @Post('dev-login')
  devLogin(
    @Body() dto: { role?: 'client' | 'worker' },
    @Req() request: Request,
  ) {
    this.limit(request, 'dev-login', 10, 60_000);
    return this.auth.devLogin(dto?.role === 'worker' ? 'worker' : 'client');
  }

  @Post('login')
  login(@Body() dto: LoginUserDto, @Req() request: Request) {
    this.limit(
      request,
      `login:${dto.email.trim().toLowerCase()}`,
      10,
      15 * 60_000,
    );
    return this.auth.login(dto);
  }

  @Post('password-reset/request')
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() request: Request,
  ) {
    this.limit(request, 'password-reset-request', 5, 15 * 60_000);
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    this.limit(request, 'password-reset-confirm', 10, 15 * 60_000);
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email-verification/request')
  requestEmailVerification(
    @Req() request: Request & { user?: { id?: number } },
  ) {
    this.limit(request, 'email-verification-request', 5, 15 * 60_000);
    return this.auth.requestEmailVerification(Number(request.user?.id));
  }

  @Post('email-verification/confirm')
  confirmEmail(@Body() dto: ConfirmEmailDto, @Req() request: Request) {
    this.limit(request, 'email-verification-confirm', 10, 15 * 60_000);
    return this.auth.confirmEmail(dto.token);
  }

  @Post('register-client')
  registerClient(
    @Body() dto: CompatibleRegisterUserDto,
    @Req() request: Request,
  ) {
    this.limit(request, 'register', 5, 60 * 60_000);
    return this.auth.register({ ...dto, role: 'client' });
  }

  @Post('register-worker')
  registerWorker(
    @Body() dto: CompatibleRegisterUserDto,
    @Req() request: Request,
  ) {
    this.limit(request, 'register', 5, 60 * 60_000);
    return this.auth.register({ ...dto, role: 'worker' });
  }

  private limit(
    request: Request,
    scope: string,
    limit: number,
    windowMs: number,
  ) {
    const tracker = request.ip || request.socket.remoteAddress || 'unknown';
    this.rateLimit.consume(scope, tracker, limit, windowMs);
  }
}

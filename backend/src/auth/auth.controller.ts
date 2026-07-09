import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { TokenDto } from './dto/token.dto';
import { EmailDto } from './dto/email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.auth.register(dto);
  }


  @Post('dev-login')
  devLogin(@Body() dto: { role?: 'client' | 'worker' }) {
    return this.auth.devLogin(dto?.role === 'worker' ? 'worker' : 'client');
  }
  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return this.auth.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: TokenDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: EmailDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('register-client')
registerClient(@Body() dto: any) {
  return this.auth.register({ ...dto, role: 'client' });
}

@Post('register-worker')
registerWorker(@Body() dto: any) {
  return this.auth.register({ ...dto, role: 'worker' });
}


}



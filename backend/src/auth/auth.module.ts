import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { UsersModule } from '../users/users.module';
import { WorkersModule } from '../workers/workers.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { getJwtSecret } from '../config/runtime-config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetTokenEntity } from './password-reset-token.entity';
import { MailModule } from '../mail/mail.module';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { EmailVerificationTokenEntity } from './email-verification-token.entity';

@Module({
  imports: [
    UsersModule,
    WorkersModule,
    ReferralsModule,
    MailModule,
    TypeOrmModule.forFeature([
      PasswordResetTokenEntity,
      EmailVerificationTokenEntity,
    ]),
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: getJwtSecret({
          NODE_ENV: config.get<string>('NODE_ENV'),
          JWT_SECRET: config.get<string>('JWT_SECRET'),
        }),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRateLimitService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

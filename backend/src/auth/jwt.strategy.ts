import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from '../config/runtime-config';
import { UsersService } from '../users/users.service';

type AuthTokenPayload = {
  id: number;
  role: string;
  authVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret({
        NODE_ENV: config.get<string>('NODE_ENV'),
        JWT_SECRET: config.get<string>('JWT_SECRET'),
      }),
    });
  }

  async validate(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    const user = await this.users.findOne(Number(payload.id));
    if (
      !user ||
      user.status !== 'active' ||
      Number(payload.authVersion || 0) !== Number(user.authVersion || 0)
    ) {
      throw new UnauthorizedException('Сесията е невалидна');
    }
    return {
      id: payload.id,
      role: payload.role,
      authVersion: Number(payload.authVersion || 0),
    };
  }
}

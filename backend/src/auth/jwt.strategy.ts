import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from '../config/runtime-config';

type AuthTokenPayload = {
  id: number;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret({
        NODE_ENV: config.get<string>('NODE_ENV'),
        JWT_SECRET: config.get<string>('JWT_SECRET'),
      }),
    });
  }

  validate(payload: AuthTokenPayload): AuthTokenPayload {
    return {
      id: payload.id,
      role: payload.role,
    };
  }
}

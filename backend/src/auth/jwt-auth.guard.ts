import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from '../config/runtime-config';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: string | jwt.JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.headers.authorization;

    if (!auth) throw new UnauthorizedException('Missing token');

    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid token format');

    try {
      req.user = jwt.verify(
        token,
        getJwtSecret({
          NODE_ENV: this.config.get<string>('NODE_ENV'),
          JWT_SECRET: this.config.get<string>('JWT_SECRET'),
        }),
      );
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

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
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/user.entity';

type AuthenticatedRequest = Request & {
  user?: string | jwt.JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.headers.authorization;

    if (!auth) throw new UnauthorizedException('Missing token');

    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid token format');

    try {
      const tokenUser = jwt.verify(
        token,
        getJwtSecret({
          NODE_ENV: this.config.get<string>('NODE_ENV'),
          JWT_SECRET: this.config.get<string>('JWT_SECRET'),
        }),
      );
      const userId = Number(
        typeof tokenUser === 'string' ? 0 : tokenUser.id ?? tokenUser.sub,
      );
      if (!userId) throw new UnauthorizedException('Invalid token');

      const currentUser = await this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { id: userId } });
      if (!currentUser || currentUser.status !== 'active') {
        throw new UnauthorizedException('Account is not active');
      }

      req.user = {
        ...(typeof tokenUser === 'string' ? {} : tokenUser),
        id: currentUser.id,
        role: currentUser.role,
        status: currentUser.status,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token');
    }
  }
}

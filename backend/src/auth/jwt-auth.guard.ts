import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;

    if (!auth) throw new UnauthorizedException('Missing token');

    const [type, token] = auth.split(' ');
    if (type !== 'Bearer') throw new UnauthorizedException('Invalid token format');

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey') as any;
      const user = await this.dataSource.getRepository(UserEntity).findOne({
        where: { id: Number(payload.id) },
        select: { id: true, role: true, accountStatus: true },
      });
      if (!user || user.accountStatus === 'suspended') {
        throw new UnauthorizedException('Account is unavailable');
      }
      req.user = { ...payload, id: user.id, role: user.role };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token');
    }
  }
}

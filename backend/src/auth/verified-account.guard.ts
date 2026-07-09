import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class VerifiedAccountGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const actor = req.user;
    const userId = Number(actor?.id);

    if (!userId) throw new ForbiddenException('Account verification required');

    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        accountStatus: true,
        emailVerifiedAt: true,
        emailVerificationRequired: true,
      },
    });

    if (!user || user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is unavailable');
    }

    if (user.role === 'admin') return true;

    if (user.emailVerificationRequired && !user.emailVerifiedAt) {
      throw new ForbiddenException('Потвърди имейла си, за да продължиш.');
    }

    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class KnowledgeAdminGuard implements CanActivate {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}
  async canActivate(context: ExecutionContext) {
    const id = Number(context.switchToHttp().getRequest().user?.id);
    const user = Number.isSafeInteger(id) ? await this.users.findOneBy({ id }) : null;
    if (!user || user.status !== 'active' || !['admin', 'super_admin'].includes(user.role)) throw new ForbiddenException('Само за администратор');
    return true;
  }
}

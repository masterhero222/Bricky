import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestEntity } from '../requests/entities/request.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { AdminController } from './admin.controller';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminService } from './admin.service';
import { AdminAuditLogEntity } from './entities/admin-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RequestEntity, RequestImageEntity, AdminAuditLogEntity])],
  controllers: [AdminController],
  providers: [AdminService, AdminRoleGuard],
})
export class AdminModule {}


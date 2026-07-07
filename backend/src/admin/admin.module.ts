import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestEntity } from '../requests/entities/request.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { AdminController } from './admin.controller';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminService } from './admin.service';
import { AdminAuditLogEntity } from './entities/admin-audit-log.entity';
import { Worker } from '../workers/worker.entity';
import { WorkerGalleryImage } from '../workers/worker-gallery-image.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MediaModerationService } from './media-moderation.service';

@Module({
  imports: [NotificationsModule, TypeOrmModule.forFeature([
    RequestEntity, RequestImageEntity, Worker, WorkerGalleryImage, ReviewEntity, UserEntity, AdminAuditLogEntity,
  ])],
  controllers: [AdminController],
  providers: [AdminService, AdminRoleGuard, MediaModerationService],
})
export class AdminModule {}

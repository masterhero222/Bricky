import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRoleGuard } from '../admin/admin-role.guard';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';
import { NotificationEntity } from '../notifications/notification.entity';
import { UserEntity } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { DataSubjectRequestEntity } from './data-subject-request.entity';
import { PrivacyAdminController, PrivacyController } from './privacy.controller';
import { PrivacyPreferenceEntity } from './privacy-preference.entity';
import { PrivacyService } from './privacy.service';
import { UserLegalAcceptanceEntity } from './user-legal-acceptance.entity';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([UserLegalAcceptanceEntity, PrivacyPreferenceEntity, DataSubjectRequestEntity, UserEntity, AdminAuditLogEntity, NotificationEntity])],
  controllers: [PrivacyController, PrivacyAdminController],
  providers: [PrivacyService, AdminRoleGuard],
  exports: [PrivacyService],
})
export class PrivacyModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEntity } from './referral.entity';
import { ReferralQualificationEntity } from './referral-qualification.entity';
import { ReferralRewardEntity } from './referral-reward.entity';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { UserEntity } from '../users/user.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralEntity,
      ReferralQualificationEntity,
      ReferralRewardEntity,
      UserEntity,
      RepairRequestEntity,
      AdminAuditLogEntity,
    ]),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService, TypeOrmModule],
})
export class ReferralsModule {}

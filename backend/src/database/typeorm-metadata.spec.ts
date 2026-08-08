import 'reflect-metadata';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';
import { PasswordResetTokenEntity } from '../auth/password-reset-token.entity';
import { WorkerCreditTransactionEntity } from '../billing/worker-credit-transaction.entity';
import { WorkerCreditWalletEntity } from '../billing/worker-credit-wallet.entity';
import { WorkerPlanEntity } from '../billing/worker-plan.entity';
import { PricingRuleEntity } from '../catalog/pricing-rule.entity';
import { RepairActivityEntity } from '../catalog/repair-activity.entity';
import { RepairCategoryEntity } from '../catalog/repair-category.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { NotificationEntity } from '../notifications/notification.entity';
import { ReferralQualificationEntity } from '../referrals/referral-qualification.entity';
import { ReferralRewardEntity } from '../referrals/referral-reward.entity';
import { ReferralEntity } from '../referrals/referral.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { RequestApplicationEntity } from '../requests/entities/request-application.entity';
import { RequestEventEntity } from '../requests/entities/request-event.entity';
import { RequestImageEntity } from '../requests/entities/request-image.entity';
import { RequestPricingSnapshotEntity } from '../requests/entities/request-pricing-snapshot.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { ClientProfileEntity } from '../users/client-profile.entity';
import { UserEntity } from '../users/user.entity';
import { WorkerGalleryImage } from '../workers/worker-gallery-image.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { WorkerSkillEntity } from '../workers/worker-skill.entity';
import { Worker } from '../workers/worker.entity';

const activeEntities: EntityTarget<ObjectLiteral>[] = [
  UserEntity,
  ClientProfileEntity,
  Worker,
  WorkerGalleryImage,
  WorkerProfileEntity,
  WorkerSkillEntity,
  RepairRequestEntity,
  RequestApplicationEntity,
  RequestImageEntity,
  RequestEventEntity,
  RequestPricingSnapshotEntity,
  ReviewEntity,
  NotificationEntity,
  MediaAssetEntity,
  RepairCategoryEntity,
  RepairActivityEntity,
  PricingRuleEntity,
  WorkerPlanEntity,
  WorkerCreditWalletEntity,
  WorkerCreditTransactionEntity,
  ReferralEntity,
  ReferralQualificationEntity,
  ReferralRewardEntity,
  AdminAuditLogEntity,
  PasswordResetTokenEntity,
];

describe('TypeORM application metadata', () => {
  it('builds the active MySQL entity metadata without connecting to a database', async () => {
    const dataSource = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'metadata-check',
      password: 'metadata-check',
      database: 'metadata-check',
      entities: activeEntities,
      synchronize: false,
    });

    const metadataBuilder = dataSource as unknown as {
      buildMetadatas: () => Promise<void>;
    };

    await expect(metadataBuilder.buildMetadatas()).resolves.toBeUndefined();
    expect(dataSource.entityMetadatas).toHaveLength(activeEntities.length);
    expect(
      dataSource.getMetadata(RequestApplicationEntity).tableName,
    ).toBe('repair_request_applications');
    expect(dataSource.getMetadata(RequestEventEntity).tableName).toBe(
      'repair_request_events',
    );
    expect(dataSource.getMetadata(ReviewEntity).tableName).toBe(
      'repair_request_reviews',
    );
    expect(dataSource.getMetadata(NotificationEntity).tableName).toBe(
      'user_notifications',
    );
    expect(dataSource.getMetadata(AdminAuditLogEntity).tableName).toBe(
      'admin_action_audit_logs',
    );
  });
});

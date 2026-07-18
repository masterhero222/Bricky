import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLogEntity } from './admin-audit-log.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { WorkersModule } from '../workers/workers.module';
import { RequestsModule } from '../requests/requests.module';
import { MediaModule } from '../media/media.module';
import { BillingModule } from '../billing/billing.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminAuditLogEntity]),
    UsersModule,
    WorkersModule,
    RequestsModule,
    MediaModule,
    BillingModule,
    ReferralsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

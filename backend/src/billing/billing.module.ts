import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerPlanEntity } from './worker-plan.entity';
import { WorkerCreditWalletEntity } from './worker-credit-wallet.entity';
import { WorkerCreditTransactionEntity } from './worker-credit-transaction.entity';
import { BillingService } from './billing.service';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerPlanEntity,
      WorkerCreditWalletEntity,
      WorkerCreditTransactionEntity,
      WorkerProfileEntity,
    ]),
  ],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

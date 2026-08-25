import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WorkerCreditTransactionEntity } from './worker-credit-transaction.entity';
import { WorkerCreditWalletEntity } from './worker-credit-wallet.entity';
import { WorkerPlanEntity } from './worker-plan.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';

@Injectable()
export class BillingService {
  constructor(private readonly dataSource: DataSource) {}

  async adjustCredits(
    workerUserId: number,
    amount: number,
    adminUserId: number,
    reason = 'admin_adjustment',
    transactionManager?: EntityManager,
  ) {
    this.assertId(workerUserId, 'workerUserId');
    this.assertId(adminUserId, 'adminUserId');
    const creditDelta = Number(amount);
    if (!Number.isSafeInteger(creditDelta) || creditDelta === 0) {
      throw new BadRequestException('Credit amount must be a non-zero integer');
    }
    const transactionReason = this.normalizeReason(reason);

    const operation = async (manager: EntityManager) => {
      await this.assertWorker(manager, workerUserId);
      const wallets = manager.getRepository(WorkerCreditWalletEntity);
      const transactions = manager.getRepository(WorkerCreditTransactionEntity);

      let wallet = await wallets.findOne({
        where: { workerUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = wallets.create({ workerUserId, balance: 0 });
      }

      const nextBalance = Number(wallet.balance) + creditDelta;
      if (nextBalance < 0) {
        throw new BadRequestException('Credit balance cannot be negative');
      }

      wallet.balance = nextBalance;
      const savedWallet = await wallets.save(wallet);
      await transactions.save(
        transactions.create({
          workerUserId,
          amount: creditDelta,
          balanceAfter: nextBalance,
          reason: transactionReason,
          adminUserId,
          metadataJson: null,
        }),
      );

      return savedWallet;
    };

    return transactionManager
      ? operation(transactionManager)
      : this.dataSource.transaction(operation);
  }

  async setPlan(
    workerUserId: number,
    planKey: string,
    transactionManager?: EntityManager,
  ) {
    this.assertId(workerUserId, 'workerUserId');
    const normalizedPlanKey = String(planKey || 'free')
      .trim()
      .toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,79}$/.test(normalizedPlanKey)) {
      throw new BadRequestException('Invalid plan key');
    }

    const operation = async (manager: EntityManager) => {
      await this.assertWorker(manager, workerUserId);
      const plans = manager.getRepository(WorkerPlanEntity);
      const existing = await plans.findOne({
        where: { workerUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        existing.planKey = normalizedPlanKey;
        existing.status = 'active';
        return plans.save(existing);
      }

      return plans.save(
        plans.create({
          workerUserId,
          planKey: normalizedPlanKey,
          status: 'active',
          startsAt: new Date(),
          endsAt: null,
        }),
      );
    };

    return transactionManager
      ? operation(transactionManager)
      : this.dataSource.transaction(operation);
  }

  private async assertWorker(
    manager: EntityManager,
    workerUserId: number,
  ): Promise<void> {
    const worker = await manager.getRepository(WorkerProfileEntity).findOne({
      where: { userId: workerUserId },
      select: { userId: true },
    });
    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }
  }

  private assertId(value: number, name: string): void {
    if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
      throw new BadRequestException(`Invalid ${name}`);
    }
  }

  private normalizeReason(reason: string): string {
    const normalized = String(reason || 'admin_adjustment').trim();
    if (!normalized || normalized.length > 80) {
      throw new BadRequestException(
        'Credit transaction reason must be between 1 and 80 characters',
      );
    }
    return normalized;
  }
}

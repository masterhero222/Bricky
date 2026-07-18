import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerCreditTransactionEntity } from './worker-credit-transaction.entity';
import { WorkerCreditWalletEntity } from './worker-credit-wallet.entity';
import { WorkerPlanEntity } from './worker-plan.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(WorkerCreditWalletEntity)
    private readonly wallets: Repository<WorkerCreditWalletEntity>,
    @InjectRepository(WorkerCreditTransactionEntity)
    private readonly transactions: Repository<WorkerCreditTransactionEntity>,
    @InjectRepository(WorkerPlanEntity)
    private readonly plans: Repository<WorkerPlanEntity>,
  ) {}

  async adjustCredits(workerUserId: number, amount: number, adminUserId: number, reason = 'admin_adjustment') {
    if (!workerUserId) throw new BadRequestException('Missing workerUserId');
    if (!Number.isFinite(Number(amount)) || Number(amount) === 0) throw new BadRequestException('Invalid amount');

    let wallet = await this.wallets.findOne({ where: { workerUserId } });
    if (!wallet) wallet = this.wallets.create({ workerUserId, balance: 0 });
    wallet.balance += Number(amount);
    await this.wallets.save(wallet);

    await this.transactions.save(
      this.transactions.create({
        workerUserId,
        amount: Number(amount),
        balanceAfter: wallet.balance,
        reason,
        adminUserId,
        metadataJson: null,
      }),
    );

    return wallet;
  }

  async setPlan(workerUserId: number, planKey: string) {
    if (!workerUserId) throw new BadRequestException('Missing workerUserId');
    const existing = await this.plans.findOne({ where: { workerUserId, status: 'active' } });
    if (existing) {
      existing.planKey = planKey || 'free';
      return this.plans.save(existing);
    }
    return this.plans.save(this.plans.create({ workerUserId, planKey: planKey || 'free', status: 'active' }));
  }
}

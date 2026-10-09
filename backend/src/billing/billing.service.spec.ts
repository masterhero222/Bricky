import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BillingService } from './billing.service';
import { WorkerCreditTransactionEntity } from './worker-credit-transaction.entity';
import { WorkerCreditWalletEntity } from './worker-credit-wallet.entity';
import { WorkerPlanEntity } from './worker-plan.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';

describe('BillingService', () => {
  function setup(options?: {
    workerExists?: boolean;
    wallet?: Partial<WorkerCreditWalletEntity> | null;
    plan?: Partial<WorkerPlanEntity> | null;
  }) {
    const workerExists = options?.workerExists ?? true;
    const workerRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(workerExists ? { userId: 201 } : null),
    };
    const walletRepo = {
      findOne: jest.fn().mockResolvedValue(options?.wallet ?? null),
      create: jest.fn(
        (value: Partial<WorkerCreditWalletEntity>) =>
          value as WorkerCreditWalletEntity,
      ),
      save: jest.fn((value: WorkerCreditWalletEntity) =>
        Promise.resolve({ id: 1, ...value } as WorkerCreditWalletEntity),
      ),
    };
    const transactionRepo = {
      create: jest.fn(
        (value: Partial<WorkerCreditTransactionEntity>) =>
          value as WorkerCreditTransactionEntity,
      ),
      save: jest.fn((value: WorkerCreditTransactionEntity) =>
        Promise.resolve({
          id: 1,
          ...value,
        } as WorkerCreditTransactionEntity),
      ),
    };
    const planRepo = {
      findOne: jest.fn().mockResolvedValue(options?.plan ?? null),
      create: jest.fn(
        (value: Partial<WorkerPlanEntity>) => value as WorkerPlanEntity,
      ),
      save: jest.fn((value: WorkerPlanEntity) =>
        Promise.resolve({ id: 1, ...value } as WorkerPlanEntity),
      ),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === WorkerProfileEntity) return workerRepo;
        if (entity === WorkerCreditWalletEntity) return walletRepo;
        if (entity === WorkerCreditTransactionEntity) return transactionRepo;
        if (entity === WorkerPlanEntity) return planRepo;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (transactionManager: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    };

    return {
      service: new BillingService(dataSource as unknown as DataSource),
      dataSource,
      workerRepo,
      walletRepo,
      transactionRepo,
      planRepo,
    };
  }

  it('atomically creates a wallet and matching ledger transaction', async () => {
    const { service, dataSource, walletRepo, transactionRepo } = setup();

    const wallet = await service.adjustCredits(201, 25, 1, 'beta_grant');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(walletRepo.findOne).toHaveBeenCalledWith({
      where: { workerUserId: 201 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(wallet).toEqual(expect.objectContaining({ balance: 25 }));
    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workerUserId: 201,
        amount: 25,
        balanceAfter: 25,
        reason: 'beta_grant',
        adminUserId: 1,
      }),
    );
  });

  it('allows deductions without permitting a negative balance', async () => {
    const valid = setup({ wallet: { id: 4, workerUserId: 201, balance: 30 } });
    await expect(
      valid.service.adjustCredits(201, -10, 1, 'manual_deduction'),
    ).resolves.toEqual(expect.objectContaining({ balance: 20 }));

    const invalid = setup({
      wallet: { id: 4, workerUserId: 201, balance: 5 },
    });
    await expect(
      invalid.service.adjustCredits(201, -10, 1, 'manual_deduction'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(invalid.walletRepo.save).not.toHaveBeenCalled();
    expect(invalid.transactionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects fractional amounts and missing worker profiles', async () => {
    const invalidAmount = setup();
    await expect(
      invalidAmount.service.adjustCredits(201, 1.5, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(invalidAmount.dataSource.transaction).not.toHaveBeenCalled();

    const missingWorker = setup({ workerExists: false });
    await expect(
      missingWorker.service.adjustCredits(201, 10, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(missingWorker.walletRepo.save).not.toHaveBeenCalled();
  });

  it('normalizes and updates the single worker plan row', async () => {
    const existingPlan = {
      id: 8,
      workerUserId: 201,
      planKey: 'free',
      status: 'active',
    };
    const { service, planRepo } = setup({ plan: existingPlan });

    const plan = await service.setPlan(201, ' PRO_PLUS ');

    expect(planRepo.findOne).toHaveBeenCalledWith({
      where: { workerUserId: 201 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(planRepo.create).not.toHaveBeenCalled();
    expect(plan).toEqual(
      expect.objectContaining({ planKey: 'pro_plus', status: 'active' }),
    );
  });

  it('rejects plan labels that are not stable machine keys', async () => {
    const { service, dataSource } = setup();

    await expect(service.setPlan(201, 'Про план')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

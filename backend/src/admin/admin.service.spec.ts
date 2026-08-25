import { AdminService } from './admin.service';
import { AdminAuditLogEntity } from './admin-audit-log.entity';

describe('AdminService media moderation referral trigger', () => {
  function setup(mediaResult: any) {
    const auditRepo = {
      create: jest.fn(
        (value: Partial<AdminAuditLogEntity>) => value as AdminAuditLogEntity,
      ),
      save: jest.fn((value: AdminAuditLogEntity) => Promise.resolve(value)),
    };
    const media = {
      setModerationStatus: jest.fn().mockResolvedValue(mediaResult),
    };
    const referrals = {
      processCompletedRequest: jest.fn().mockResolvedValue(null),
    };
    const billing = {
      adjustCredits: jest
        .fn()
        .mockResolvedValue({ workerUserId: 201, balance: 20 }),
      setPlan: jest
        .fn()
        .mockResolvedValue({ workerUserId: 201, planKey: 'pro' }),
    };
    const transactionalAuditRepo = {
      create: jest.fn(
        (value: Partial<AdminAuditLogEntity>) => value as AdminAuditLogEntity,
      ),
      save: jest.fn((value: AdminAuditLogEntity) => Promise.resolve(value)),
    };
    const manager = {
      getRepository: jest.fn(() => transactionalAuditRepo),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (transactionManager: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    const users = {
      updateStatus: jest.fn().mockResolvedValue({ id: 201, status: 'active' }),
    };
    const workers = {
      setApprovalStatus: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'private',
      }),
      setWallVisibility: jest.fn().mockResolvedValue({
        userId: 201,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      }),
    };
    const service = new AdminService(
      auditRepo as never,
      users as never,
      workers as never,
      {} as never,
      media as never,
      billing as never,
      referrals as never,
      {} as never,
      {} as never,
      dataSource as never,
    );
    return {
      service,
      referrals,
      billing,
      dataSource,
      manager,
      transactionalAuditRepo,
      users,
      workers,
    };
  }

  it('rechecks referral qualification when request media is approved', async () => {
    const { service, referrals } = setup({ id: 9, requestId: 55 });

    await service.setMediaModeration(1, 9, 'approved');

    expect(referrals.processCompletedRequest).toHaveBeenCalledWith(55);
  });

  it('does not recheck qualification for rejected media or profile-only media', async () => {
    const rejected = setup({ id: 9, requestId: 55 });
    await rejected.service.setMediaModeration(
      1,
      9,
      'rejected',
      'not relevant',
    );
    expect(rejected.referrals.processCompletedRequest).not.toHaveBeenCalled();

    const avatar = setup({ id: 10, requestId: null });
    await avatar.service.setMediaModeration(1, 10, 'approved');
    expect(avatar.referrals.processCompletedRequest).not.toHaveBeenCalled();
  });

  it('requires an audit reason for destructive moderation actions', async () => {
    const { service } = setup({ id: 9, requestId: 55 });

    await expect(service.setMediaModeration(1, 9, 'rejected')).rejects.toThrow(
      'Reason is required',
    );
    await expect(service.setUserStatus(1, 201, 'blocked')).rejects.toThrow(
      'Reason is required',
    );
    await expect(
      service.setWorkerApproval(1, 201, 'suspended'),
    ).rejects.toThrow('Reason is required');
  });

  it('commits credit adjustment and audit entry in one transaction', async () => {
    const { service, billing, dataSource, manager, transactionalAuditRepo } =
      setup(null);

    await service.adjustCredits(1, 201, 20, 'beta grant');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(billing.adjustCredits).toHaveBeenCalledWith(
      201,
      20,
      1,
      'beta grant',
      manager,
    );
    expect(transactionalAuditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: 1,
        action: 'credits.adjusted',
        targetType: 'worker',
        targetId: '201',
      }),
    );
  });

  it('commits plan assignment and audit entry in one transaction', async () => {
    const { service, billing, dataSource, manager } = setup(null);

    await service.setPlan(1, 201, 'pro', 'manual plan');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(billing.setPlan).toHaveBeenCalledWith(201, 'pro', manager);
  });

  it('activates a worker without automatically placing them on the wall', async () => {
    const { service, users, workers, manager, transactionalAuditRepo } =
      setup(null);

    await service.setWorkerApproval(1, 201, 'approved', 'profile verified');

    expect(users.updateStatus).toHaveBeenCalledWith(201, 'active', manager);
    expect(workers.setApprovalStatus).toHaveBeenCalledWith(
      201,
      'approved',
      undefined,
      manager,
    );
    expect(transactionalAuditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'worker.approval_changed',
        targetId: '201',
        metadataJson: expect.objectContaining({
          approvalStatus: 'approved',
          userStatus: 'active',
          visibilityStatus: 'private',
        }),
      }),
    );
  });

  it('manages public wall placement separately from approval', async () => {
    const { service, workers } = setup(null);

    await service.setWorkerWallVisibility(1, 201, true, 'manual listing');

    expect(workers.setWallVisibility).toHaveBeenCalledWith(201, true);
  });
});

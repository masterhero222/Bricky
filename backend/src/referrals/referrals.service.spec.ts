import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { UserEntity } from '../users/user.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { ReferralQualificationEntity } from './referral-qualification.entity';
import { ReferralRewardEntity } from './referral-reward.entity';
import { ReferralEntity } from './referral.entity';
import { ReferralsService } from './referrals.service';

type Store = {
  referrals: any[];
  qualifications: any[];
  rewards: any[];
  users: any[];
  requests: any[];
  profiles: any[];
  media: any[];
  audits: any[];
};

function matches(row: any, where: Record<string, any> = {}) {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (value?._type === 'isNull') return row[key] == null;
    return row[key] === value;
  });
}

function memoryRepo(rows: any[]) {
  return {
    create: jest.fn((value) => ({ ...value })),
    findOne: jest.fn(async ({ where }: any) => rows.find((row) => matches(row, where)) || null),
    find: jest.fn(async ({ where = {}, order }: any = {}) => {
      const found = rows.filter((row) => matches(row, where));
      if (order?.endsAt === 'DESC') {
        return found.sort(
          (left, right) =>
            new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime(),
        );
      }
      return found;
    }),
    save: jest.fn(async (value) => {
      if (!value.id) {
        value.id = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
        rows.push(value);
      }
      return value;
    }),
  };
}

function validRequest(id: number, workerUserId: number, clientUserId: number) {
  const now = new Date('2026-07-19T12:00:00.000Z');
  return {
    id,
    assignedWorkerUserId: workerUserId,
    clientUserId,
    status: 'completed',
    clientConfirmedAt: now,
    archivedAt: now,
    archiveReason: 'closed_by_worker',
    archiveSource: 'worker',
  };
}

function setup(overrides: Partial<Store> = {}) {
  const store: Store = {
    referrals: [
      {
        id: 1,
        code: 'WORKER1',
        type: 'worker_to_worker',
        referrerUserId: 100,
        referredUserId: 200,
        status: 'registered',
        qualifiedRepairCount: 0,
        qualifiedAt: null,
        rewardedAt: null,
      },
    ],
    qualifications: [],
    rewards: [],
    users: [
      { id: 100, role: 'worker', status: 'active' },
      { id: 200, role: 'worker', status: 'active' },
      { id: 301, role: 'client', status: 'active' },
      { id: 302, role: 'client', status: 'active' },
    ],
    requests: [
      validRequest(1, 200, 301),
      validRequest(2, 200, 302),
    ],
    profiles: [
      {
        userId: 200,
        approvalStatus: 'approved',
        visibilityStatus: 'public',
      },
    ],
    media: [
      { id: 1, requestId: 1, kind: 'request_before', moderationStatus: 'approved' },
      { id: 2, requestId: 2, kind: 'request_before', moderationStatus: 'approved' },
    ],
    audits: [],
    ...overrides,
  };

  const repositories = new Map<any, any>([
    [ReferralEntity, memoryRepo(store.referrals)],
    [ReferralQualificationEntity, memoryRepo(store.qualifications)],
    [ReferralRewardEntity, memoryRepo(store.rewards)],
    [UserEntity, memoryRepo(store.users)],
    [RepairRequestEntity, memoryRepo(store.requests)],
    [WorkerProfileEntity, memoryRepo(store.profiles)],
    [MediaAssetEntity, memoryRepo(store.media)],
    [AdminAuditLogEntity, memoryRepo(store.audits)],
  ]);
  const manager = {
    getRepository: jest.fn((entity) => repositories.get(entity)),
  };
  const dataSource = {
    transaction: jest.fn(async (work) => work(manager)),
  };
  const service = new ReferralsService(
    repositories.get(ReferralEntity),
    repositories.get(ReferralQualificationEntity),
    repositories.get(ReferralRewardEntity),
    repositories.get(UserEntity),
    repositories.get(AdminAuditLogEntity),
    dataSource as any,
  );

  return { service, store, dataSource, manager };
}

describe('ReferralsService qualification and reward integrity', () => {
  it('returns one open code and rejects an inactive owner inside registration', async () => {
    const { service, store, dataSource, manager } = setup({
      referrals: [],
    });

    const first = await service.getOrCreateCode({ id: 100, role: 'worker' });
    const second = await service.getOrCreateCode({ id: 100, role: 'worker' });

    expect(first.code).toBe(second.code);
    expect(store.referrals).toHaveLength(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(2);

    store.users.find((user) => user.id === 100).status = 'blocked';
    await expect(
      service.attachRegistration(first.code, 200, 'worker', manager as any),
    ).rejects.toThrow('Referral owner is not eligible');
  });

  it('waits for request media approval before counting a completed repair', async () => {
    const { service, store } = setup();
    store.media[0].moderationStatus = 'pending';

    await expect(service.processCompletedRequest(1)).resolves.toBeNull();
    expect(store.qualifications).toHaveLength(0);

    store.media[0].moderationStatus = 'approved';
    const result = await service.processCompletedRequest(1);

    expect(result?.referral).toEqual(
      expect.objectContaining({
        status: 'qualifying',
        qualifiedRepairCount: 1,
      }),
    );
    expect(store.qualifications).toHaveLength(1);
  });

  it.each([
    ['reviewed lifecycle', { status: 'reviewed' }],
    ['missing client confirmation', { clientConfirmedAt: null }],
    ['client cancellation archive', { archiveReason: 'canceled_by_client' }],
    ['non-worker archive source', { archiveSource: 'admin' }],
  ])('rejects a request with %s', async (_label, requestPatch) => {
    const { service, store } = setup();
    Object.assign(store.requests[0], requestPatch);

    await expect(service.processCompletedRequest(1)).resolves.toBeNull();
    expect(store.qualifications).toHaveLength(0);
  });

  it('does not reward two repairs completed for the same client', async () => {
    const { service, store } = setup();
    store.requests[1].clientUserId = 301;

    await service.processCompletedRequest(1);
    const result = await service.processCompletedRequest(2);

    expect(store.qualifications).toHaveLength(2);
    expect(result?.referral.qualifiedRepairCount).toBe(1);
    expect(store.rewards).toHaveLength(0);
  });

  it('issues exactly one reward for two distinct clients and keeps retries idempotent', async () => {
    const { service, store, dataSource } = setup();

    await service.processCompletedRequest(1);
    const qualified = await service.processCompletedRequest(2);
    const originalEnd = store.rewards[0].endsAt.getTime();
    const retried = await service.processCompletedRequest(2);

    expect(dataSource.transaction).toHaveBeenCalledTimes(3);
    expect(qualified?.referral.status).toBe('rewarded');
    expect(store.qualifications).toHaveLength(2);
    expect(store.rewards).toHaveLength(1);
    expect(store.rewards[0].endsAt.getTime()).toBe(originalEnd);
    expect(retried?.reward.id).toBe(store.rewards[0].id);
    expect(store.audits.filter((audit) => audit.action === 'referral.rewarded')).toHaveLength(1);
  });

  it('extends one active reward once when a second referred worker qualifies', async () => {
    const { service, store } = setup();
    await service.processCompletedRequest(1);
    await service.processCompletedRequest(2);
    const firstEnd = store.rewards[0].endsAt.getTime();

    store.referrals.push({
      id: 2,
      code: 'WORKER2',
      type: 'worker_to_worker',
      referrerUserId: 100,
      referredUserId: 201,
      status: 'registered',
      qualifiedRepairCount: 0,
      qualifiedAt: null,
      rewardedAt: null,
    });
    store.users.push({ id: 201, role: 'worker', status: 'active' });
    store.users.push(
      { id: 303, role: 'client', status: 'active' },
      { id: 304, role: 'client', status: 'active' },
    );
    store.profiles.push({
      userId: 201,
      approvalStatus: 'approved',
      visibilityStatus: 'public',
    });
    store.requests.push(
      validRequest(3, 201, 303),
      validRequest(4, 201, 304),
    );
    store.media.push(
      { id: 3, requestId: 3, kind: 'request_before', moderationStatus: 'approved' },
      { id: 4, requestId: 4, kind: 'request_before', moderationStatus: 'approved' },
    );

    await service.processCompletedRequest(3);
    await service.processCompletedRequest(4);
    const extendedEnd = store.rewards[0].endsAt.getTime();
    await service.processCompletedRequest(4);

    expect(store.rewards).toHaveLength(1);
    expect(extendedEnd - firstEnd).toBe(30 * 24 * 60 * 60 * 1000);
    expect(store.rewards[0].endsAt.getTime()).toBe(extendedEnd);
    expect(store.rewards[0].metadataJson.earnedReferralIds).toEqual([1, 2]);

    const detail = await service.adminGet(2);
    expect(detail.rewards).toHaveLength(1);

    await service.revokeReward(2, 900, 'manual fraud review');
    expect(store.rewards[0].status).toBe('revoked');

    await service.restoreReward(2, 900, 'false positive');
    expect(store.rewards[0].status).toBe('active');
  });

  it.each([
    ['suspended worker', { userStatus: 'blocked' }],
    ['unapproved worker', { approvalStatus: 'pending' }],
    ['hidden worker', { visibilityStatus: 'hidden' }],
  ])('rejects qualification for a %s', async (_label, condition) => {
    const { service, store } = setup();
    if (condition.userStatus) store.users.find((user) => user.id === 200).status = condition.userStatus;
    if (condition.approvalStatus) store.profiles[0].approvalStatus = condition.approvalStatus;
    if (condition.visibilityStatus) store.profiles[0].visibilityStatus = condition.visibilityStatus;

    await expect(service.processCompletedRequest(1)).resolves.toBeNull();
    expect(store.qualifications).toHaveLength(0);
    expect(store.rewards).toHaveLength(0);
  });
});

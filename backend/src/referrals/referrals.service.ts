import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { ReferralEntity, ReferralStatus, ReferralType } from './referral.entity';
import { ReferralQualificationEntity } from './referral-qualification.entity';
import { ReferralRewardEntity } from './referral-reward.entity';
import { UserEntity } from '../users/user.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';

const BOOST_REWARD_TYPE = 'top_placement_30_days';
const BOOST_DAYS = 30;

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralEntity)
    private readonly referralsRepo: Repository<ReferralEntity>,
    @InjectRepository(ReferralQualificationEntity)
    private readonly qualificationsRepo: Repository<ReferralQualificationEntity>,
    @InjectRepository(ReferralRewardEntity)
    private readonly rewardsRepo: Repository<ReferralRewardEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(AdminAuditLogEntity)
    private readonly auditRepo: Repository<AdminAuditLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getMine(user: any) {
    const userId = Number(user?.id);
    if (!userId) throw new BadRequestException('Missing user id');

    const type = this.typeForRole(user?.role);
    const [openCode, invites, rewards] = await Promise.all([
      this.referralsRepo.findOne({
        where: { referrerUserId: userId, type, status: 'created', referredUserId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
      this.referralsRepo.find({ where: { referrerUserId: userId, type }, order: { createdAt: 'DESC' }, take: 50 }),
      this.rewardsRepo.find({ where: { userId }, order: { endsAt: 'DESC' }, take: 10 }),
    ]);

    return {
      code: openCode?.code || null,
      referralUrl: openCode ? this.shareUrl(openCode.code) : null,
      type,
      invites: invites.map((referral) => ({
        id: referral.id,
        code: referral.code,
        status: referral.status,
        referredUserId: referral.referredUserId,
        qualifiedRepairCount: referral.qualifiedRepairCount,
        qualifiedAt: referral.qualifiedAt,
        rewardedAt: referral.rewardedAt,
        rejectionReason: referral.rejectionReason,
        createdAt: referral.createdAt,
      })),
      rewards,
    };
  }

  async getOrCreateCode(user: any) {
    const userId = Number(user?.id);
    if (!userId) throw new BadRequestException('Missing user id');
    if (!['worker', 'client'].includes(String(user?.role))) {
      throw new BadRequestException('Referral codes are available to clients and workers only');
    }

    const type = this.typeForRole(user?.role);
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const referrals = manager.getRepository(ReferralEntity);
      const owner = await users.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !owner ||
        owner.status !== 'active' ||
        owner.role !== String(user.role)
      ) {
        throw new BadRequestException('Referral owner is not eligible');
      }

      const existing = await referrals.findOne({
        where: {
          referrerUserId: userId,
          type,
          status: 'created',
          referredUserId: IsNull(),
        },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        return {
          code: existing.code,
          referralUrl: this.shareUrl(existing.code),
          type,
        };
      }

      const referral = await referrals.save(
        referrals.create({
          code: await this.generateUniqueCode(referrals),
          type,
          referrerUserId: userId,
          referredUserId: null,
          status: 'created',
          qualifiedRepairCount: 0,
        }),
      );

      return {
        code: referral.code,
        referralUrl: this.shareUrl(referral.code),
        type,
      };
    });
  }

  async validateCode(code: string, registeringRole?: string) {
    const referral = await this.findOpenCode(code);
    if (!referral) throw new BadRequestException('Invalid referral code');

    if (registeringRole) {
      const expected = this.typeForRole(registeringRole);
      if (referral.type !== expected) throw new BadRequestException('Referral code is not valid for this account type');
    }

    const referrer = await this.usersRepo.findOne({ where: { id: referral.referrerUserId } });
    const expectedReferrerRole = referral.type === 'worker_to_worker' ? 'worker' : 'client';
    if (
      !referrer ||
      referrer.status !== 'active' ||
      referrer.role !== expectedReferrerRole
    ) {
      throw new BadRequestException('Referral owner is not eligible');
    }

    return {
      ok: true,
      code: referral.code,
      type: referral.type,
      referrerRole: referrer.role,
    };
  }

  async attachRegistration(
    code: string | undefined,
    referredUserId: number,
    referredRole: string,
    manager?: EntityManager,
  ) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return null;

    const repo = manager?.getRepository(ReferralEntity) ?? this.referralsRepo;
    const referral = await this.findOpenCode(cleanCode, repo, Boolean(manager));
    if (!referral) throw new BadRequestException('Invalid referral code');
    if (Number(referral.referrerUserId) === Number(referredUserId)) throw new BadRequestException('Self-referral is not allowed');
    if (referral.type !== this.typeForRole(referredRole)) {
      throw new BadRequestException('Referral code is not valid for this account type');
    }

    const userRepo = manager?.getRepository(UserEntity) ?? this.usersRepo;
    const referrer = await userRepo.findOne({
      where: { id: referral.referrerUserId },
      ...(manager ? { lock: { mode: 'pessimistic_read' as const } } : {}),
    });
    const expectedReferrerRole = referral.type === 'worker_to_worker' ? 'worker' : 'client';
    if (
      !referrer ||
      referrer.status !== 'active' ||
      referrer.role !== expectedReferrerRole
    ) {
      throw new BadRequestException('Referral owner is not eligible');
    }

    const existingForUser = await repo.findOne({ where: { referredUserId } });
    if (existingForUser) throw new BadRequestException('This account already has a referral');

    referral.referredUserId = referredUserId;
    referral.status = 'registered';
    await repo.save(referral);

    return referral;
  }

  async processCompletedRequest(requestId: number) {
    const normalizedRequestId = Number(requestId);
    if (!normalizedRequestId) return null;

    return this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(RepairRequestEntity);
      const referrals = manager.getRepository(ReferralEntity);
      const qualifications = manager.getRepository(ReferralQualificationEntity);
      const users = manager.getRepository(UserEntity);
      const workerProfiles = manager.getRepository(WorkerProfileEntity);
      const media = manager.getRepository(MediaAssetEntity);

      const request = await requests.findOne({
        where: { id: normalizedRequestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!this.isQualifyingRequest(request)) return null;

      const workerUserId = Number(request.assignedWorkerUserId);
      if (!workerUserId || Number(request.clientUserId) === workerUserId) return null;

      const referral = await referrals.findOne({
        where: {
          type: 'worker_to_worker',
          referredUserId: workerUserId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!referral || referral.status === 'rejected') return null;
      if (referral.status === 'rewarded') {
        return this.currentReferralResult(referral, manager);
      }

      const [worker, client, referrer, workerProfile, requestMedia] = await Promise.all([
        users.findOne({ where: { id: workerUserId } }),
        users.findOne({ where: { id: request.clientUserId } }),
        users.findOne({
          where: { id: referral.referrerUserId },
          lock: { mode: 'pessimistic_write' },
        }),
        workerProfiles.findOne({ where: { userId: workerUserId } }),
        media.find({ where: { requestId: normalizedRequestId } }),
      ]);

      if (
        !worker ||
        worker.status !== 'active' ||
        !client ||
        client.status !== 'active' ||
        !referrer ||
        referrer.status !== 'active' ||
        referrer.role !== 'worker'
      ) {
        return null;
      }
      if (
        !workerProfile ||
        workerProfile.approvalStatus !== 'approved' ||
        workerProfile.visibilityStatus === 'hidden'
      ) {
        return null;
      }
      if (!this.requestMediaIsApproved(requestMedia)) return null;

      const countedRequest = await qualifications.findOne({
        where: { requestId: normalizedRequestId },
      });
      if (!countedRequest) {
        await qualifications.save(
          qualifications.create({
            referralId: referral.id,
            requestId: normalizedRequestId,
            referredWorkerUserId: workerUserId,
            clientUserId: request.clientUserId,
            status: 'qualified',
            qualifiedAt: new Date(),
            reason: 'completed_request',
          }),
        );
      } else if (Number(countedRequest.referralId) !== Number(referral.id)) {
        return null;
      }

      return this.refreshReferralProgress(referral, manager);
    });
  }

  async adminList() {
    const [referrals, rewards] = await Promise.all([
      this.referralsRepo.find({ order: { createdAt: 'DESC' }, take: 200 }),
      this.rewardsRepo.find({ order: { createdAt: 'DESC' }, take: 200 }),
    ]);

    return referrals.map((referral) => ({
      ...referral,
      rewards: rewards.filter((reward) =>
        this.rewardReferralIds(reward).includes(Number(referral.id)),
      ),
    }));
  }

  async adminGet(id: number) {
    const referral = await this.referralsRepo.findOne({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');
    const [qualifications, ownedRewards] = await Promise.all([
      this.qualificationsRepo.find({ where: { referralId: id }, order: { createdAt: 'DESC' } }),
      this.rewardsRepo.find({
        where: {
          userId: referral.referrerUserId,
          rewardType: BOOST_REWARD_TYPE,
        },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const rewards = ownedRewards.filter((reward) =>
      this.rewardReferralIds(reward).includes(Number(id)),
    );
    return { referral, qualifications, rewards };
  }

  async reject(id: number, adminUserId: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
    const referral = await this.referralsRepo.findOne({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');
    referral.status = 'rejected';
    referral.rejectionReason = reason.trim();
    await this.referralsRepo.save(referral);
    await this.audit(adminUserId, 'referral.rejected', 'referral', id, reason);
    return referral;
  }

  async revokeReward(id: number, adminUserId: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
    await this.dataSource.transaction(async (manager) => {
      const referrals = manager.getRepository(ReferralEntity);
      const rewardsRepo = manager.getRepository(ReferralRewardEntity);
      const referral = await referrals.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!referral) throw new NotFoundException('Referral not found');

      const ownedRewards = await rewardsRepo.find({
        where: {
          userId: referral.referrerUserId,
          rewardType: BOOST_REWARD_TYPE,
          status: 'active',
        },
        lock: { mode: 'pessimistic_write' },
      });
      const rewards = ownedRewards.filter((reward) =>
        this.rewardReferralIds(reward).includes(Number(id)),
      );
      for (const reward of rewards) {
        reward.status = 'revoked';
        reward.metadataJson = {
          ...(reward.metadataJson || {}),
          revokedReason: reason.trim(),
          revokedBy: adminUserId,
        };
        await rewardsRepo.save(reward);
      }
      await this.audit(
        adminUserId,
        'referral_reward.revoked',
        'referral',
        id,
        reason,
        { rewardIds: rewards.map((reward) => reward.id) },
        manager,
      );
    });
    return this.adminGet(id);
  }

  async restoreReward(id: number, adminUserId: number, reason: string) {
    return this.dataSource.transaction(async (manager) => {
      const referrals = manager.getRepository(ReferralEntity);
      const rewards = manager.getRepository(ReferralRewardEntity);
      const referral = await referrals.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!referral) throw new NotFoundException('Referral not found');

      const ownedRewards = await rewards.find({
        where: { userId: referral.referrerUserId, rewardType: BOOST_REWARD_TYPE },
        order: { endsAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      let reward = this.findRewardForReferral(ownedRewards, referral.id);
      const now = new Date();

      if (!reward) {
        reward = rewards.create({
          referralId: referral.id,
          userId: referral.referrerUserId,
          rewardType: BOOST_REWARD_TYPE,
          status: 'active',
          startsAt: now,
          endsAt: this.addDays(now, BOOST_DAYS),
          metadataJson: {
            source: 'admin_restore',
            earnedReferralIds: [referral.id],
          },
        });
      } else if (reward.status !== 'active' || reward.endsAt <= now) {
        reward.status = 'active';
        reward.startsAt = now;
        reward.endsAt = this.addDays(now, BOOST_DAYS);
      }
      reward.metadataJson = {
        ...(reward.metadataJson || {}),
        restoredBy: adminUserId,
        restoredReason: reason || null,
      };
      const saved = await rewards.save(reward);
      await this.audit(
        adminUserId,
        'referral_reward.restored',
        'referral',
        id,
        reason || null,
        { rewardId: saved.id },
        manager,
      );
      return saved;
    });
  }

  async getActiveBoost(userId: number) {
    const now = new Date();
    return this.rewardsRepo.findOne({
      where: { userId, rewardType: BOOST_REWARD_TYPE, status: 'active', endsAt: MoreThan(now) },
      order: { endsAt: 'DESC' },
    });
  }

  private async refreshReferralProgress(
    referral: ReferralEntity,
    manager: EntityManager,
  ) {
    const referrals = manager.getRepository(ReferralEntity);
    const qualificationsRepo = manager.getRepository(ReferralQualificationEntity);
    const qualifications = await qualificationsRepo.find({
      where: { referralId: referral.id, status: 'qualified' },
    });
    const distinctClients = new Set(qualifications.map((item) => Number(item.clientUserId)).filter(Boolean));
    referral.qualifiedRepairCount = Math.min(qualifications.length, distinctClients.size);

    if (referral.qualifiedRepairCount >= 2) {
      referral.status = 'qualified';
      referral.qualifiedAt = referral.qualifiedAt || new Date();
      await referrals.save(referral);
      const reward = await this.issueOrExtendReward(referral, manager);
      referral.status = 'rewarded';
      referral.rewardedAt = referral.rewardedAt || new Date();
      await referrals.save(referral);
      await this.audit(
        null,
        'referral.rewarded',
        'referral',
        referral.id,
        'system_qualification',
        { rewardId: reward.id },
        manager,
      );
      return { referral, reward };
    }

    referral.status = 'qualifying';
    await referrals.save(referral);
    return { referral };
  }

  private async issueOrExtendReward(
    referral: ReferralEntity,
    manager: EntityManager,
  ) {
    const rewards = manager.getRepository(ReferralRewardEntity);
    const now = new Date();
    const ownedRewards = await rewards.find({
      where: {
        userId: referral.referrerUserId,
        rewardType: BOOST_REWARD_TYPE,
      },
      order: { endsAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
    const alreadyIssued = this.findRewardForReferral(ownedRewards, referral.id);
    if (alreadyIssued) return alreadyIssued;

    const active = ownedRewards.find(
      (reward) => reward.status === 'active' && reward.endsAt > now,
    );

    if (active) {
      active.endsAt = this.addDays(active.endsAt, BOOST_DAYS);
      active.metadataJson = {
        ...(active.metadataJson || {}),
        earnedReferralIds: [
          ...this.rewardReferralIds(active),
          referral.id,
        ],
        extendedByReferral: referral.id,
      };
      return rewards.save(active);
    }

    return rewards.save(
      rewards.create({
        referralId: referral.id,
        userId: referral.referrerUserId,
        rewardType: BOOST_REWARD_TYPE,
        status: 'active',
        startsAt: now,
        endsAt: this.addDays(now, BOOST_DAYS),
        metadataJson: {
          source: 'worker_to_worker_referral',
          earnedReferralIds: [referral.id],
        },
      }),
    );
  }

  private isQualifyingRequest(
    request: RepairRequestEntity | null,
  ): request is RepairRequestEntity {
    return Boolean(
      request &&
      request.status === 'completed' &&
      request.clientConfirmedAt &&
      request.archivedAt &&
      request.archiveReason === 'closed_by_worker' &&
      request.archiveSource === 'worker',
    );
  }

  private requestMediaIsApproved(media: MediaAssetEntity[]) {
    return media
      .filter((asset) => ['request_before', 'request_after'].includes(asset.kind))
      .every((asset) => asset.moderationStatus === 'approved');
  }

  private async currentReferralResult(
    referral: ReferralEntity,
    manager: EntityManager,
  ) {
    const rewards = await manager.getRepository(ReferralRewardEntity).find({
      where: {
        userId: referral.referrerUserId,
        rewardType: BOOST_REWARD_TYPE,
      },
      order: { endsAt: 'DESC' },
    });
    return {
      referral,
      reward: this.findRewardForReferral(rewards, referral.id) || null,
    };
  }

  private findRewardForReferral(
    rewards: ReferralRewardEntity[],
    referralId: number,
  ) {
    return rewards.find(
      (reward) =>
        Number(reward.referralId) === Number(referralId) ||
        this.rewardReferralIds(reward).includes(Number(referralId)),
    );
  }

  private rewardReferralIds(reward: ReferralRewardEntity) {
    const ids = Array.isArray(reward.metadataJson?.earnedReferralIds)
      ? reward.metadataJson.earnedReferralIds
      : [reward.referralId];
    return [...new Set(ids.map(Number).filter(Boolean))];
  }

  private async findOpenCode(
    code: string,
    repo: Repository<ReferralEntity> = this.referralsRepo,
    lockForUpdate = false,
  ) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return null;
    return repo.findOne({
      where: { code: clean, status: 'created', referredUserId: IsNull() },
      ...(lockForUpdate ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  private typeForRole(role: any): ReferralType {
    return String(role) === 'worker' ? 'worker_to_worker' : 'client_to_client';
  }

  private shareUrl(code: string) {
    const base = process.env.PUBLIC_APP_URL || 'https://bricky.bg';
    return `${base.replace(/\/$/, '')}/auth/register?ref=${encodeURIComponent(code)}`;
  }

  private async generateUniqueCode(
    repo: Repository<ReferralEntity> = this.referralsRepo,
  ) {
    for (let i = 0; i < 20; i += 1) {
      const code = `BR${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const existing = await repo.findOne({ where: { code } });
      if (!existing) return code;
    }
    throw new BadRequestException('Could not generate referral code');
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private async audit(
    adminUserId: number | null,
    action: string,
    targetType: string,
    targetId: number | string,
    reason?: string | null,
    metadataJson?: Record<string, any>,
    manager?: EntityManager,
  ) {
    const repo = manager?.getRepository(AdminAuditLogEntity) ?? this.auditRepo;
    return repo.save(
      repo.create({
        adminUserId,
        action,
        targetType,
        targetId: String(targetId),
        reason: reason || null,
        metadataJson: metadataJson || null,
      }),
    );
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { ReferralEntity, ReferralStatus, ReferralType } from './referral.entity';
import { ReferralQualificationEntity } from './referral-qualification.entity';
import { ReferralRewardEntity } from './referral-reward.entity';
import { UserEntity } from '../users/user.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';

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
    @InjectRepository(RepairRequestEntity)
    private readonly repairRequestsRepo: Repository<RepairRequestEntity>,
    @InjectRepository(AdminAuditLogEntity)
    private readonly auditRepo: Repository<AdminAuditLogEntity>,
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

    const type = this.typeForRole(user?.role);
    const existing = await this.referralsRepo.findOne({
      where: { referrerUserId: userId, type, status: 'created', referredUserId: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (existing) return { code: existing.code, referralUrl: this.shareUrl(existing.code), type };

    const referral = await this.referralsRepo.save(
      this.referralsRepo.create({
        code: await this.generateUniqueCode(),
        type,
        referrerUserId: userId,
        referredUserId: null,
        status: 'created',
        qualifiedRepairCount: 0,
      }),
    );

    return { code: referral.code, referralUrl: this.shareUrl(referral.code), type };
  }

  async validateCode(code: string, registeringRole?: string) {
    const referral = await this.findOpenCode(code);
    if (!referral) throw new BadRequestException('Invalid referral code');

    if (registeringRole) {
      const expected = this.typeForRole(registeringRole);
      if (referral.type !== expected) throw new BadRequestException('Referral code is not valid for this account type');
    }

    const referrer = await this.usersRepo.findOne({ where: { id: referral.referrerUserId } });
    if (!referrer || referrer.status !== 'active') throw new BadRequestException('Referral owner is not active');

    return {
      ok: true,
      code: referral.code,
      type: referral.type,
      referrerRole: referrer.role,
    };
  }

  async attachRegistration(code: string | undefined, referredUserId: number, referredRole: string) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return null;

    const referral = await this.findOpenCode(cleanCode);
    if (!referral) throw new BadRequestException('Invalid referral code');
    if (Number(referral.referrerUserId) === Number(referredUserId)) throw new BadRequestException('Self-referral is not allowed');
    if (referral.type !== this.typeForRole(referredRole)) {
      throw new BadRequestException('Referral code is not valid for this account type');
    }

    const existingForUser = await this.referralsRepo.findOne({ where: { referredUserId } });
    if (existingForUser) throw new BadRequestException('This account already has a referral');

    referral.referredUserId = referredUserId;
    referral.status = 'registered';
    await this.referralsRepo.save(referral);

    return referral;
  }

  async processCompletedRequest(requestId: number, workerUserId: number) {
    const request = await this.repairRequestsRepo.findOne({ where: { id: requestId } });
    if (!request || !['reviewed', 'completed'].includes(request.status)) return null;
    if (Number(request.assignedWorkerUserId) !== Number(workerUserId)) return null;
    if (!request.clientUserId || Number(request.clientUserId) === Number(workerUserId)) return null;

    const referral = await this.referralsRepo.findOne({
      where: { type: 'worker_to_worker', referredUserId: workerUserId },
    });
    if (!referral || ['rewarded', 'rejected'].includes(referral.status)) return null;

    const [worker, client] = await Promise.all([
      this.usersRepo.findOne({ where: { id: workerUserId } }),
      this.usersRepo.findOne({ where: { id: request.clientUserId } }),
    ]);
    if (!worker || worker.status !== 'active' || !client || client.status !== 'active') return null;

    const countedRequest = await this.qualificationsRepo.findOne({ where: { requestId } });
    if (countedRequest) return this.refreshReferralProgress(referral.id);

    await this.qualificationsRepo.save(
      this.qualificationsRepo.create({
        referralId: referral.id,
        requestId,
        referredWorkerUserId: workerUserId,
        clientUserId: request.clientUserId,
        status: 'qualified',
        qualifiedAt: new Date(),
        reason: 'completed_request',
      }),
    );

    return this.refreshReferralProgress(referral.id);
  }

  async adminList() {
    const [referrals, rewards] = await Promise.all([
      this.referralsRepo.find({ order: { createdAt: 'DESC' }, take: 200 }),
      this.rewardsRepo.find({ order: { createdAt: 'DESC' }, take: 200 }),
    ]);

    return referrals.map((referral) => ({
      ...referral,
      rewards: rewards.filter((reward) => reward.referralId === referral.id),
    }));
  }

  async adminGet(id: number) {
    const referral = await this.referralsRepo.findOne({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');
    const [qualifications, rewards] = await Promise.all([
      this.qualificationsRepo.find({ where: { referralId: id }, order: { createdAt: 'DESC' } }),
      this.rewardsRepo.find({ where: { referralId: id }, order: { createdAt: 'DESC' } }),
    ]);
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
    const rewards = await this.rewardsRepo.find({ where: { referralId: id, status: 'active' } });
    for (const reward of rewards) {
      reward.status = 'revoked';
      reward.metadataJson = { ...(reward.metadataJson || {}), revokedReason: reason.trim(), revokedBy: adminUserId };
      await this.rewardsRepo.save(reward);
    }
    await this.audit(adminUserId, 'referral_reward.revoked', 'referral', id, reason);
    return this.adminGet(id);
  }

  async restoreReward(id: number, adminUserId: number, reason: string) {
    const reward = await this.issueOrExtendReward(id);
    await this.audit(adminUserId, 'referral_reward.restored', 'referral', id, reason || null);
    return reward;
  }

  async getActiveBoost(userId: number) {
    const now = new Date();
    return this.rewardsRepo.findOne({
      where: { userId, rewardType: BOOST_REWARD_TYPE, status: 'active', endsAt: MoreThan(now) },
      order: { endsAt: 'DESC' },
    });
  }

  private async refreshReferralProgress(referralId: number) {
    const referral = await this.referralsRepo.findOne({ where: { id: referralId } });
    if (!referral) return null;

    const qualifications = await this.qualificationsRepo.find({ where: { referralId, status: 'qualified' } });
    const distinctClients = new Set(qualifications.map((item) => Number(item.clientUserId)).filter(Boolean));
    referral.qualifiedRepairCount = Math.min(qualifications.length, distinctClients.size);

    if (referral.qualifiedRepairCount >= 2) {
      referral.status = 'qualified';
      referral.qualifiedAt = referral.qualifiedAt || new Date();
      await this.referralsRepo.save(referral);
      const reward = await this.issueOrExtendReward(referral.id);
      referral.status = 'rewarded';
      referral.rewardedAt = referral.rewardedAt || new Date();
      await this.referralsRepo.save(referral);
      await this.audit(null, 'referral.rewarded', 'referral', referral.id, 'system_qualification', { rewardId: reward.id });
      return { referral, reward };
    }

    referral.status = 'qualifying';
    await this.referralsRepo.save(referral);
    return { referral };
  }

  private async issueOrExtendReward(referralId: number) {
    const referral = await this.referralsRepo.findOne({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Referral not found');

    const now = new Date();
    const active = await this.rewardsRepo.findOne({
      where: {
        referralId,
        userId: referral.referrerUserId,
        rewardType: BOOST_REWARD_TYPE,
        status: 'active',
        endsAt: MoreThan(now),
      },
      order: { endsAt: 'DESC' },
    });

    if (active) {
      active.endsAt = this.addDays(active.endsAt, BOOST_DAYS);
      active.metadataJson = { ...(active.metadataJson || {}), extendedByReferral: referralId };
      return this.rewardsRepo.save(active);
    }

    return this.rewardsRepo.save(
      this.rewardsRepo.create({
        referralId,
        userId: referral.referrerUserId,
        rewardType: BOOST_REWARD_TYPE,
        status: 'active',
        startsAt: now,
        endsAt: this.addDays(now, BOOST_DAYS),
        metadataJson: { source: 'worker_to_worker_referral' },
      }),
    );
  }

  private async findOpenCode(code: string) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return null;
    return this.referralsRepo.findOne({ where: { code: clean, status: 'created', referredUserId: IsNull() } });
  }

  private typeForRole(role: any): ReferralType {
    return String(role) === 'worker' ? 'worker_to_worker' : 'client_to_client';
  }

  private shareUrl(code: string) {
    const base = process.env.PUBLIC_APP_URL || 'https://bricky.bg';
    return `${base.replace(/\/$/, '')}/auth/register?ref=${encodeURIComponent(code)}`;
  }

  private async generateUniqueCode() {
    for (let i = 0; i < 20; i += 1) {
      const code = `BR${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const existing = await this.referralsRepo.findOne({ where: { code } });
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
  ) {
    return this.auditRepo.save(
      this.auditRepo.create({
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

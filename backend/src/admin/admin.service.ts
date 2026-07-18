import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLogEntity } from './admin-audit-log.entity';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RequestsService } from '../requests/requests.service';
import { MediaService } from '../media/media.service';
import { BillingService } from '../billing/billing.service';
import { RepairRequestStatus } from '../requests/entities/repair-request.entity';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminAuditLogEntity)
    private readonly auditRepo: Repository<AdminAuditLogEntity>,
    private readonly users: UsersService,
    private readonly workers: WorkersService,
    private readonly requests: RequestsService,
    private readonly media: MediaService,
    private readonly billing: BillingService,
    private readonly referrals: ReferralsService,
  ) {}

  listAudit() {
    return this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  listUsers(query?: string) {
    return this.users.searchUsers(query || '');
  }

  async setUserStatus(actorUserId: number, userId: number, status: string, reason?: string) {
    this.assertOneOf(status, ['active', 'pending', 'blocked', 'deleted'], 'Invalid user status');
    const user = await this.users.updateStatus(userId, status);
    await this.log(actorUserId, 'user.status_changed', 'user', userId, reason, { status });
    return user;
  }

  listWorkers() {
    return this.workers.getAll({ includeUnapprovedMedia: true });
  }

  async setWorkerApproval(actorUserId: number, workerUserId: number, approvalStatus: string, reason?: string) {
    this.assertOneOf(approvalStatus, ['pending', 'approved', 'rejected', 'suspended'], 'Invalid worker approval status');
    const worker = await this.workers.setApprovalStatus(workerUserId, approvalStatus);
    await this.log(actorUserId, 'worker.approval_changed', 'worker', workerUserId, reason, { approvalStatus });
    return worker;
  }

  listRequests(queue?: string) {
    return this.requests.adminListRequests(queue);
  }

  async setRequestStatus(actorUserId: number, requestId: number, status: RepairRequestStatus, reason?: string) {
    this.assertOneOf(
      status,
      [
        'draft',
        'pending_admin',
        'published',
        'applied',
        'assigned',
        'worker_selected',
        'worker_confirmed',
        'worker_on_site',
        'inspected',
        'in_progress',
        'work_finished',
        'ready_for_client_confirmation',
        'client_confirmed',
        'reviewed',
        'completed',
        'canceled',
        'archived',
      ],
      'Invalid request status',
    );
    const request = await this.requests.adminSetStatus(requestId, status, actorUserId, reason);
    await this.log(actorUserId, 'request.status_changed', 'request', requestId, reason, { status });
    return request;
  }

  listMedia() {
    return this.media.listAll();
  }

  async setMediaModeration(actorUserId: number, id: number, moderationStatus: string, reason?: string) {
    this.assertOneOf(moderationStatus, ['pending', 'approved', 'rejected'], 'Invalid moderation status');
    const media = await this.media.setModerationStatus(id, moderationStatus);
    await this.log(actorUserId, 'media.moderation_changed', 'media', id, reason, { moderationStatus });
    return media;
  }

  async adjustCredits(actorUserId: number, workerUserId: number, amount: number, reason?: string) {
    const wallet = await this.billing.adjustCredits(workerUserId, Number(amount), actorUserId, reason || 'admin_adjustment');
    await this.log(actorUserId, 'credits.adjusted', 'worker', workerUserId, reason, { amount });
    return wallet;
  }

  async setPlan(actorUserId: number, workerUserId: number, planKey: string, reason?: string) {
    const plan = await this.billing.setPlan(workerUserId, planKey || 'free');
    await this.log(actorUserId, 'worker.plan_changed', 'worker', workerUserId, reason, { planKey: plan.planKey });
    return plan;
  }

  listReferrals() {
    return this.referrals.adminList();
  }

  getReferral(id: number) {
    return this.referrals.adminGet(id);
  }

  rejectReferral(actorUserId: number, id: number, reason: string) {
    return this.referrals.reject(id, actorUserId, reason);
  }

  revokeReferralReward(actorUserId: number, id: number, reason: string) {
    return this.referrals.revokeReward(id, actorUserId, reason);
  }

  restoreReferralReward(actorUserId: number, id: number, reason?: string) {
    return this.referrals.restoreReward(id, actorUserId, reason || 'admin_restore');
  }

  private async log(
    adminUserId: number,
    action: string,
    targetType: string,
    targetId: number | string,
    reason?: string,
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

  private assertOneOf(value: string, allowed: string[], message: string) {
    if (!allowed.includes(String(value))) throw new BadRequestException(message);
  }
}

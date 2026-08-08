import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AdminAuditLogEntity } from './admin-audit-log.entity';
import { UsersService } from '../users/users.service';
import { WorkersService } from '../workers/workers.service';
import { RequestsService } from '../requests/requests.service';
import { MediaService } from '../media/media.service';
import { BillingService } from '../billing/billing.service';
import { RepairRequestStatus } from '../requests/entities/repair-request.entity';
import { ReferralsService } from '../referrals/referrals.service';
import {
  CatalogActivityInput,
  CatalogCategoryInput,
  CatalogService,
  PricingRuleInput,
} from '../catalog/catalog.service';
import { ReportsService } from '../reports/reports.service';

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
    private readonly catalog: CatalogService,
    private readonly reports: ReportsService,
    private readonly dataSource: DataSource,
  ) {}

  listAudit() {
    return this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  listUsers(query?: string) {
    return this.users.searchUsers(query || '');
  }

  async setUserStatus(
    actorUserId: number,
    userId: number,
    status: string,
    reason?: string,
  ) {
    this.assertOneOf(
      status,
      ['active', 'pending', 'blocked', 'deleted'],
      'Invalid user status',
    );
    if (['blocked', 'deleted'].includes(status)) this.requireReason(reason);
    const user = await this.users.updateStatus(userId, status);
    await this.log(actorUserId, 'user.status_changed', 'user', userId, reason, {
      status,
    });
    return user;
  }

  listWorkers() {
    return this.workers.getAllForAdmin();
  }

  async setWorkerApproval(
    actorUserId: number,
    workerUserId: number,
    approvalStatus: string,
    reason?: string,
  ) {
    this.assertOneOf(
      approvalStatus,
      ['pending', 'approved', 'rejected', 'suspended'],
      'Invalid worker approval status',
    );
    if (['rejected', 'suspended'].includes(approvalStatus)) {
      this.requireReason(reason);
    }
    return this.dataSource.transaction(async (manager) => {
      if (approvalStatus === 'approved') {
        await this.users.updateStatus(workerUserId, 'active', manager);
      }

      const worker = await this.workers.setApprovalStatus(
        workerUserId,
        approvalStatus,
        undefined,
        manager,
      );
      await this.log(
        actorUserId,
        'worker.approval_changed',
        'worker',
        workerUserId,
        reason,
        {
          approvalStatus,
          userStatus: approvalStatus === 'approved' ? 'active' : undefined,
          visibilityStatus: (worker as any)?.visibilityStatus,
        },
        manager,
      );
      return worker;
    });
  }

  listReports(status?: string) {
    return this.reports.list(status);
  }

  async resolveReport(
    actorUserId: number,
    reportId: number,
    status: string,
    note: string,
  ) {
    const report = await this.reports.resolve(
      reportId,
      actorUserId,
      status,
      note,
    );
    await this.log(
      actorUserId,
      'content_report.status_changed',
      'content_report',
      reportId,
      note,
      {
        status,
        targetType: report.targetType,
        targetId: report.targetId,
      },
    );
    return report;
  }

  async setWorkerWallVisibility(
    actorUserId: number,
    workerUserId: number,
    listed: boolean,
    reason?: string,
  ) {
    const worker = await this.workers.setWallVisibility(workerUserId, listed);
    await this.log(
      actorUserId,
      'worker.wall_visibility_changed',
      'worker',
      workerUserId,
      reason,
      { listed, visibilityStatus: listed ? 'public' : 'private' },
    );
    return worker;
  }

  listRequests(queue?: string) {
    return this.requests.adminListRequests(queue);
  }

  getRequestTimeline(requestId: number) {
    return this.requests.adminGetTimeline(requestId);
  }

  async setRequestStatus(
    actorUserId: number,
    requestId: number,
    status: RepairRequestStatus,
    reason?: string,
  ) {
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
    if (['canceled', 'archived'].includes(status)) this.requireReason(reason);
    const request = await this.requests.adminSetStatus(
      requestId,
      status,
      actorUserId,
      reason,
    );
    await this.log(
      actorUserId,
      'request.status_changed',
      'request',
      requestId,
      reason,
      { status },
    );
    return request;
  }

  async interveneRequest(
    actorUserId: number,
    requestId: number,
    action: 'cancel' | 'reopen',
    reason?: string,
  ) {
    this.assertOneOf(
      action,
      ['cancel', 'reopen'],
      'Invalid intervention action',
    );
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
    const request = await this.requests.adminIntervene(
      requestId,
      actorUserId,
      action,
      reason.trim(),
    );
    await this.log(
      actorUserId,
      `request.${action}`,
      'request',
      requestId,
      reason.trim(),
      { action },
    );
    return request;
  }

  listMedia() {
    return this.media.listAll();
  }

  listCategories() {
    return this.catalog.listCatalog();
  }

  async upsertCategory(
    actorUserId: number,
    categoryKey: string,
    input: CatalogCategoryInput,
    reason?: string,
  ) {
    const category = await this.catalog.upsertCategory(
      categoryKey,
      input || {},
    );
    await this.log(
      actorUserId,
      'catalog.category_changed',
      'repair_category',
      categoryKey,
      reason,
      {
        label: category.label,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
      },
    );
    return category;
  }

  async upsertActivity(
    actorUserId: number,
    categoryKey: string,
    activityKey: string,
    input: CatalogActivityInput,
    reason?: string,
  ) {
    const activity = await this.catalog.upsertActivity(
      categoryKey,
      activityKey,
      input || {},
    );
    await this.log(
      actorUserId,
      'catalog.activity_changed',
      'repair_activity',
      `${categoryKey}:${activityKey}`,
      reason,
      {
        label: activity.label,
        unitType: activity.unitType,
        isActive: activity.isActive,
        sortOrder: activity.sortOrder,
      },
    );
    return activity;
  }

  listPricingRules() {
    return this.catalog.listPricingRules();
  }

  async createPricingRule(
    actorUserId: number,
    input: PricingRuleInput,
    reason?: string,
  ) {
    const rule = await this.catalog.createPricingRule(input || {});
    await this.log(
      actorUserId,
      'pricing.rule_created',
      'pricing_rule',
      rule.id,
      reason,
      {
        version: rule.version,
        categoryKey: rule.categoryKey,
        activityKey: rule.activityKey,
        isActive: rule.isActive,
      },
    );
    return rule;
  }

  async setPricingRuleActive(
    actorUserId: number,
    id: number,
    isActive: boolean,
    reason?: string,
  ) {
    const rule = await this.catalog.setPricingRuleActive(id, isActive);
    await this.log(
      actorUserId,
      'pricing.rule_status_changed',
      'pricing_rule',
      id,
      reason,
      {
        isActive: rule.isActive,
        version: rule.version,
      },
    );
    return rule;
  }

  async setMediaModeration(
    actorUserId: number,
    id: number,
    moderationStatus: string,
    reason?: string,
  ) {
    this.assertOneOf(
      moderationStatus,
      ['pending', 'approved', 'rejected'],
      'Invalid moderation status',
    );
    if (moderationStatus === 'rejected') this.requireReason(reason);
    const media = await this.media.setModerationStatus(id, moderationStatus);
    await this.log(
      actorUserId,
      'media.moderation_changed',
      'media',
      id,
      reason,
      { moderationStatus },
    );
    if (moderationStatus === 'approved' && media?.requestId) {
      await this.referrals.processCompletedRequest(Number(media.requestId));
    }
    return media;
  }

  async adjustCredits(
    actorUserId: number,
    workerUserId: number,
    amount: number,
    reason?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.billing.adjustCredits(
        workerUserId,
        Number(amount),
        actorUserId,
        reason || 'admin_adjustment',
        manager,
      );
      await this.log(
        actorUserId,
        'credits.adjusted',
        'worker',
        workerUserId,
        reason,
        { amount },
        manager,
      );
      return wallet;
    });
  }

  async setPlan(
    actorUserId: number,
    workerUserId: number,
    planKey: string,
    reason?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const plan = await this.billing.setPlan(
        workerUserId,
        planKey || 'free',
        manager,
      );
      await this.log(
        actorUserId,
        'worker.plan_changed',
        'worker',
        workerUserId,
        reason,
        { planKey: plan.planKey },
        manager,
      );
      return plan;
    });
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
    return this.referrals.restoreReward(
      id,
      actorUserId,
      reason || 'admin_restore',
    );
  }

  private async log(
    adminUserId: number,
    action: string,
    targetType: string,
    targetId: number | string,
    reason?: string,
    metadataJson?: Record<string, any>,
    manager?: EntityManager,
  ) {
    const auditRepo = manager
      ? manager.getRepository(AdminAuditLogEntity)
      : this.auditRepo;
    return auditRepo.save(
      auditRepo.create({
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
    if (!allowed.includes(String(value)))
      throw new BadRequestException(message);
  }

  private requireReason(reason?: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required');
  }
}

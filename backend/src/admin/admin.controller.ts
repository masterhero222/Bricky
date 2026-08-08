import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users(@Req() req: any, @Query('q') q?: string) {
    this.assertAdmin(req.user);
    return this.admin.listUsers(q);
  }

  @Post('users/:userId/status')
  setUserStatus(@Req() req: any, @Param('userId') userId: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.setUserStatus(Number(req.user.id), Number(userId), body?.status, body?.reason);
  }

  @Get('workers')
  workers(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.admin.listWorkers();
  }

  @Post('workers/:workerUserId/approval')
  setWorkerApproval(@Req() req: any, @Param('workerUserId') workerUserId: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.setWorkerApproval(Number(req.user.id), Number(workerUserId), body?.approvalStatus, body?.reason);
  }

  @Post('workers/:workerUserId/wall-visibility')
  setWorkerWallVisibility(@Req() req: any, @Param('workerUserId') workerUserId: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.setWorkerWallVisibility(
      Number(req.user.id),
      Number(workerUserId),
      Boolean(body?.listed),
      body?.reason,
    );
  }

  @Get('requests')
  requests(@Req() req: any, @Query('queue') queue?: string) {
    this.assertAdmin(req.user);
    return this.admin.listRequests(queue);
  }

  @Get('requests/:requestId/timeline')
  requestTimeline(@Req() req: any, @Param('requestId') requestId: string) {
    this.assertAdmin(req.user);
    return this.admin.getRequestTimeline(Number(requestId));
  }

  @Post('requests/:requestId/status')
  setRequestStatus(@Req() req: any, @Param('requestId') requestId: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.setRequestStatus(Number(req.user.id), Number(requestId), body?.status, body?.reason);
  }

  @Post('requests/:requestId/intervention')
  interveneRequest(@Req() req: any, @Param('requestId') requestId: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.interveneRequest(
      Number(req.user.id),
      Number(requestId),
      body?.action,
      body?.reason,
    );
  }

  @Get('media')
  media(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.admin.listMedia();
  }

  @Get('categories')
  categories(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.admin.listCategories();
  }

  @Post('categories/:categoryKey')
  upsertCategory(@Req() req: any, @Param('categoryKey') categoryKey: string, @Body() body: any) {
    this.assertSuperAdmin(req.user);
    return this.admin.upsertCategory(Number(req.user.id), categoryKey, body, body?.reason);
  }

  @Post('categories/:categoryKey/activities/:activityKey')
  upsertActivity(
    @Req() req: any,
    @Param('categoryKey') categoryKey: string,
    @Param('activityKey') activityKey: string,
    @Body() body: any,
  ) {
    this.assertSuperAdmin(req.user);
    return this.admin.upsertActivity(Number(req.user.id), categoryKey, activityKey, body, body?.reason);
  }

  @Get('pricing')
  pricing(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.admin.listPricingRules();
  }

  @Post('pricing')
  createPricing(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.createPricingRule(Number(req.user.id), body, body?.reason);
  }

  @Post('pricing/:id/status')
  setPricingStatus(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.setPricingRuleActive(Number(req.user.id), Number(id), Boolean(body?.isActive), body?.reason);
  }

  @Post('media/:id/moderation')
  setMediaModeration(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.setMediaModeration(Number(req.user.id), Number(id), body?.moderationStatus, body?.reason);
  }

  @Post('workers/:workerUserId/credits')
  adjustCredits(@Req() req: any, @Param('workerUserId') workerUserId: string, @Body() body: any) {
    this.assertSuperAdmin(req.user);
    return this.admin.adjustCredits(Number(req.user.id), Number(workerUserId), Number(body?.amount), body?.reason);
  }

  @Post('workers/:workerUserId/plan')
  setPlan(@Req() req: any, @Param('workerUserId') workerUserId: string, @Body() body: any) {
    this.assertSuperAdmin(req.user);
    return this.admin.setPlan(Number(req.user.id), Number(workerUserId), body?.planKey, body?.reason);
  }

  @Get('audit')
  audit(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.admin.listAudit();
  }

  @Get('referrals')
  referrals(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.admin.listReferrals();
  }

  @Get('referrals/:id')
  referral(@Req() req: any, @Param('id') id: string) {
    this.assertAdmin(req.user);
    return this.admin.getReferral(Number(id));
  }

  @Post('referrals/:id/reject')
  rejectReferral(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.rejectReferral(Number(req.user.id), Number(id), body?.reason);
  }

  @Post('referrals/:id/revoke-reward')
  revokeReferralReward(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.revokeReferralReward(Number(req.user.id), Number(id), body?.reason);
  }

  @Post('referrals/:id/restore-reward')
  restoreReferralReward(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.admin.restoreReferralReward(Number(req.user.id), Number(id), body?.reason);
  }

  private assertAdmin(user: any) {
    if (!['admin', 'super_admin'].includes(String(user?.role || ''))) {
      throw new ForbiddenException('Admin only');
    }
  }

  private assertSuperAdmin(user: any) {
    if (String(user?.role || '') !== 'super_admin') throw new ForbiddenException('Super admin only');
  }
}

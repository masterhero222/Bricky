import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { ModerationStatus } from '../moderation/moderation.types';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('requests') requests(@Query('status') status?: ModerationStatus) { return this.admin.listRequests(status); }
  @Get('media') media(@Query('status') status?: ModerationStatus) { return this.admin.listMedia(status); }
  @Get('workers') workers(@Query('status') status?: ModerationStatus) { return this.admin.listWorkers(status); }
  @Get('reviews') reviews(@Query('status') status?: ModerationStatus) { return this.admin.listReviews(status); }
  @Get('users') users() { return this.admin.listUsers(); }
  @Get('audit-logs') audit() { return this.admin.listAudit(); }

  @Post('requests/:id/:action')
  requestAction(@Req() req: any, @Param('id') id: string, @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateRequest(Number(id), action, Number(req.user.id), body?.reason);
  }

  @Post('media/:id/:action')
  mediaAction(@Req() req: any, @Param('id') id: string, @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateMedia(Number(id), action, Number(req.user.id), body?.reason);
  }

  @Post('media/gallery/:id/:action')
  galleryAction(@Req() req: any, @Param('id') id: string, @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateGallery(Number(id), action, Number(req.user.id), body?.reason);
  }

  @Post('workers/:id/:target/:action')
  workerAction(@Req() req: any, @Param('id') id: string, @Param('target') target: 'profile' | 'avatar', @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateWorker(Number(id), target, action, Number(req.user.id), body?.reason);
  }

  @Post('reviews/:id/:action')
  reviewAction(@Req() req: any, @Param('id') id: string, @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateReview(Number(id), action, Number(req.user.id), body?.reason);
  }

  @Post('users/:id/:action')
  userAction(@Req() req: any, @Param('id') id: string, @Param('action') action: 'activate' | 'suspend', @Body() body: { reason?: string }) {
    return this.admin.setUserStatus(Number(id), action, Number(req.user.id), body?.reason);
  }
}

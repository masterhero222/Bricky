import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { ModerationStatus } from '../moderation/moderation.types';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('requests') requests(@Query('status') status?: ModerationStatus, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.listRequests(status, q, Number(page), Number(limit)); }
  @Get('requests/:id') request(@Param('id') id: string) { return this.admin.getRequest(Number(id)); }
  @Get('media') media(@Query('status') status?: ModerationStatus, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.listMedia(status, q, Number(page), Number(limit)); }
  @Get('media/:id') requestMediaDetail(@Param('id') id: string) { return this.admin.getMedia('request', Number(id)); }
  @Get('media/:source/:id') mediaDetail(@Param('source') source: 'request' | 'gallery' | 'avatar', @Param('id') id: string) { return this.admin.getMedia(source, Number(id)); }
  @Get('workers') workers(@Query('status') status?: ModerationStatus, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.listWorkers(status, q, Number(page), Number(limit)); }
  @Get('workers/:id') worker(@Param('id') id: string) { return this.admin.getWorker(Number(id)); }
  @Get('reviews') reviews(@Query('status') status?: ModerationStatus, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.listReviews(status, q, Number(page), Number(limit)); }
  @Get('reviews/:id') review(@Param('id') id: string) { return this.admin.getReview(Number(id)); }
  @Get('users') users() { return this.admin.listUsers(); }
  @Get('audit-logs')
  audit(@Query('q') q?: string, @Query('action') action?: string, @Query('entityType') entityType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.admin.listAudit(q, action, entityType, Number(page), Number(limit));
  }

  @Post('requests/:id/:action')
  requestAction(@Req() req: any, @Param('id') id: string, @Param('action') action: string, @Body() body: { reason?: string }) {
    return this.admin.moderateRequest(Number(id), normalizeAction(action), Number(req.user.id), body?.reason, req.ip);
  }

  @Put('requests/:id')
  editRequest(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.admin.editRequest(Number(id), body, Number(req.user.id), String(body?.reason || ''), req.ip);
  }

  @Delete('requests/:id')
  deleteRequest(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.admin.deleteRequest(Number(id), Number(req.user.id), body?.reason, req.ip);
  }

  @Post('media/:id/:action')
  mediaAction(@Req() req: any, @Param('id') id: string, @Param('action') action: string, @Body() body: { reason?: string }) {
    return this.admin.moderateMedia(Number(id), normalizeAction(action), Number(req.user.id), body?.reason, req.ip);
  }

  @Post('media/gallery/:id/:action')
  galleryAction(@Req() req: any, @Param('id') id: string, @Param('action') action: string, @Body() body: { reason?: string }) {
    return this.admin.moderateGallery(Number(id), normalizeAction(action), Number(req.user.id), body?.reason, req.ip);
  }

  @Post('workers/:id/:target/:action')
  workerAction(@Req() req: any, @Param('id') id: string, @Param('target') target: 'profile' | 'avatar', @Param('action') action: string, @Body() body: { reason?: string }) {
    return this.admin.moderateWorker(Number(id), target, normalizeAction(action), Number(req.user.id), body?.reason, req.ip);
  }

  @Post('workers/:id/:action')
  workerProfileAction(@Req() req: any, @Param('id') id: string, @Param('action') action: string, @Body() body: { reason?: string }) {
    return this.admin.moderateWorker(Number(id), 'profile', normalizeAction(action), Number(req.user.id), body?.reason, req.ip);
  }

  @Post('reviews/:id/:action')
  reviewAction(@Req() req: any, @Param('id') id: string, @Param('action') action: string, @Body() body: { reason?: string }) {
    return this.admin.moderateReview(Number(id), normalizeAction(action), Number(req.user.id), body?.reason, req.ip);
  }

  @Post('users/:id/:action')
  userAction(@Req() req: any, @Param('id') id: string, @Param('action') action: 'activate' | 'suspend', @Body() body: { reason?: string }) {
    return this.admin.setUserStatus(Number(id), action, Number(req.user.id), body?.reason, req.ip);
  }
}

function normalizeAction(action: string): ModerationStatus {
  return ({ approve: 'approved', reject: 'rejected', hide: 'hidden' } as Record<string, ModerationStatus>)[action] || action as ModerationStatus;
}

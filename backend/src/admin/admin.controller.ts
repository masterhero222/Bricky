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
  @Get('audit-logs') audit() { return this.admin.listAudit(); }

  @Post('requests/:id/:action')
  requestAction(@Req() req: any, @Param('id') id: string, @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateRequest(Number(id), action, Number(req.user.id), body?.reason);
  }

  @Post('media/:id/:action')
  mediaAction(@Req() req: any, @Param('id') id: string, @Param('action') action: ModerationStatus, @Body() body: { reason?: string }) {
    return this.admin.moderateMedia(Number(id), action, Number(req.user.id), body?.reason);
  }
}

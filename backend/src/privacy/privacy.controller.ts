import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin-role.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePrivacyRequestDto, UpdatePrivacyPreferencesDto, UpdatePrivacyRequestDto } from './dto/privacy.dto';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('config')
  config() { return this.privacy.versions(); }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@Req() req: any) { return this.privacy.getStatus(Number(req.user.id)); }

  @UseGuards(JwtAuthGuard)
  @Post('accept-current')
  acceptCurrent(@Req() req: any) {
    return this.privacy.acceptCurrentDocuments(Number(req.user.id), {
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.get?.('user-agent') || null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('preferences')
  preferences(@Req() req: any, @Body() dto: UpdatePrivacyPreferencesDto) { return this.privacy.updatePreferences(Number(req.user.id), dto); }

  @UseGuards(JwtAuthGuard)
  @Get('requests')
  requests(@Req() req: any) { return this.privacy.listOwnRequests(Number(req.user.id)); }

  @UseGuards(JwtAuthGuard)
  @Post('requests')
  createRequest(@Req() req: any, @Body() dto: CreatePrivacyRequestDto) { return this.privacy.createRequest(Number(req.user.id), dto); }

  @UseGuards(JwtAuthGuard)
  @Get('export')
  export(@Req() req: any) { return this.privacy.exportData(Number(req.user.id)); }
}

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/privacy')
export class PrivacyAdminController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('requests')
  requests(@Query('status') status?: string) { return this.privacy.listAdminRequests(status); }

  @Put('requests/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePrivacyRequestDto) {
    return this.privacy.updateAdminRequest(Number(req.user.id), Number(id), dto);
  }
}

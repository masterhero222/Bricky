import { Controller, Get, Post, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async my(@Req() req: any) {
    return this.notifications.getMy(Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  async read(@Req() req: any, @Param('id') id: string) {
    const nid = Number(id);
    if (!nid) throw new BadRequestException('Invalid id');
    return this.notifications.markRead(Number(req.user.id), nid);
  }
}

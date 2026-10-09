import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.referrals.getMine(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/code')
  code(@Req() req: any) {
    return this.referrals.getOrCreateCode(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/invites')
  async invites(@Req() req: any) {
    const mine = await this.referrals.getMine(req.user);
    return mine.invites;
  }

  @Post('validate')
  validate(@Body() body: any) {
    return this.referrals.validateCode(body?.code, body?.role);
  }

  @Get('validate/:code')
  validateParam(@Param('code') code: string) {
    return this.referrals.validateCode(code);
  }
}

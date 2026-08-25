import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('client')
export class ClientController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: any) {
    if (String(req.user?.role || '') !== 'client') {
      throw new ForbiddenException('Client role required');
    }

    const profile = await this.users.findClientProfile(Number(req.user.id));
    if (!profile) {
      throw new NotFoundException('Client profile not found');
    }

    return {
      userId: profile.userId,
      name: profile.displayName,
      phone: profile.phonePrivate,
      email: profile.user?.email ?? null,
      address: profile.defaultAddress,
    };
  }
}

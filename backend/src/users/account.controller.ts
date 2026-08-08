import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateAccountProfileDto } from './dto/update-account-profile.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.users.getAccount(Number(req.user.id));
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() body: UpdateAccountProfileDto) {
    return this.users.updateAccountProfile(Number(req.user.id), body);
  }

}

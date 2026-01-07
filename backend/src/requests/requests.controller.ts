import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequestDto } from './dto/create-request.dto';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  // ✅ CREATE REQUEST (CLIENT ONLY)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateRequestDto) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.create(dto, Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('client')
  async myRequests(@Req() req: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.getByClientUserId(Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('worker')
  async workerFeed(@Req() req: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.getForWorkersFeed();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  async apply(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.applyToRequest(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/assign')
  async assign(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');

    const workerUserId = Number(body?.workerUserId);
    if (!workerUserId) throw new BadRequestException('Missing workerUserId');

    return this.requests.assignWorker(Number(id), Number(req.user.id), workerUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unassign')
  async unassign(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.unassignWorker(Number(id), Number(req.user.id));
  }
}

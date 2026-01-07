import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Req,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateRequestDto, @Req() req: any) {
    return this.requestsService.create(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('client')
  async getClientRequests(@Req() req: any) {
    if (req.user.role !== 'client') return [];
    return this.requestsService.findAllForClient(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('worker')
  async getWorkerRequests(@Req() req: any) {
    if (req.user.role !== 'worker') return [];
    return this.requestsService.findAllForWorker();
  }

  // MVP: worker кандидатства
  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  async apply(@Param('id') id: string, @Req() req: any) {
    const requestId = Number(id);
    if (!Number.isFinite(requestId)) throw new BadRequestException('Invalid request id');
    if (req.user.role !== 'worker') return { error: 'Not a worker' };

    return this.requestsService.applyForRequest(requestId, req.user.id);
  }

  // MVP: client избира майстор
  @UseGuards(JwtAuthGuard)
  @Post(':id/assign/:workerId')
  async assign(
    @Param('id') id: string,
    @Param('workerId') workerId: string,
    @Req() req: any,
  ) {
    const requestId = Number(id);
    const wId = Number(workerId);

    if (!Number.isFinite(requestId) || !Number.isFinite(wId)) {
      throw new BadRequestException('Invalid ids');
    }
    if (req.user.role !== 'client') return { error: 'Not a client' };

    // (по-късно ще проверим дали заявката е негова)
    return this.requestsService.assignWorker(requestId, wId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const numericId = Number(id);
    if (!id || id === 'undefined' || id === 'null' || Number.isNaN(numericId)) {
      throw new BadRequestException('Invalid request ID');
    }
    return this.requestsService.findOne(numericId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestsService.remove(Number(id));
  }
}

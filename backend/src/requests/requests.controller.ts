import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedAccountGuard } from '../auth/verified-account.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestDraftDto } from './dto/request-draft.dto';

const requestImageUpload = FilesInterceptor('images', 10, {
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const ok = allowed.has(String(file.mimetype || '').toLowerCase());
    cb(ok ? null : new BadRequestException('Invalid image type'), ok);
  },
});

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}


  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post('draft')
  async draft(@Req() req: any, @Body() dto: RequestDraftDto) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.draftRequest(dto.prompt, dto.address);
  }
  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateRequestDto) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.create(dto, Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/images/before')
  @UseInterceptors(requestImageUpload)
  async uploadBefore(@Req() req: any, @Param('id') id: string, @UploadedFiles() files: any[]) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.addUploadedFiles(
      Number(id),
      Number(req.user.id),
      req.user.role,
      'before',
      files,
    );
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/images/after')
  @UseInterceptors(requestImageUpload)
  async uploadAfter(@Req() req: any, @Param('id') id: string, @UploadedFiles() files: any[]) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.addUploadedFiles(
      Number(id),
      Number(req.user.id),
      req.user.role,
      'after',
      files,
    );
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/images/:imageId/delete')
  async deleteImage(@Req() req: any, @Param('id') id: string, @Param('imageId') imageId: string) {
    return this.requests.deleteUploadedImage(
      Number(id),
      Number(imageId),
      Number(req.user.id),
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('client')
  async myRequests(@Req() req: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.getByClientUserId(Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('map')
  async mapRequests(@Req() req: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.getMapRequests(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('worker')
  async workerFeed(@Req() req: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.getForWorkersFeed(Number(req.user.id));
  }

  // ? worker ������� (���������)
  @UseGuards(JwtAuthGuard)
  @Get('worker/completed')
  async workerCompleted(@Req() req: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.getCompletedForWorker(Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/apply')
  async apply(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.applyToRequest(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/assign')
  async assign(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');

    const workerUserId = Number(body?.workerUserId);
    if (!workerUserId) throw new BadRequestException('Missing workerUserId');

    return this.requests.assignWorker(Number(id), Number(req.user.id), workerUserId);
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/unassign')
  async unassign(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.unassignWorker(Number(id), Number(req.user.id));
  }

  // ? worker ������� ������
  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/complete')
  async complete(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.completeRequest(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/arrive')
  async arrive(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.markWorkerArrived(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/start')
  async start(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.startWork(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/ready')
  async ready(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.markWorkReady(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/confirm')
  async confirm(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.confirmWork(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Post(':id/dispute')
  async dispute(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.disputeWork(Number(id), Number(req.user.id), body?.reason);
  }

  @UseGuards(JwtAuthGuard, VerifiedAccountGuard)
  @Put(':id/resubmit')
  async resubmit(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.resubmitRequest(Number(id), Number(req.user.id), body || {});
  }

}

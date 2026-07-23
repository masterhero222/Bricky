import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestDraftDto } from './dto/request-draft.dto';
import {
  deleteStoredMedia,
  storeUploadedImage,
  StoredMedia,
} from '../common/media-storage';

const REQUEST_MEDIA_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function requestMediaUploadOptions() {
  return {
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req: any, file: any, callback: any) => {
      const allowed = Boolean(
        REQUEST_MEDIA_MIME_EXTENSIONS[String(file.mimetype || '').toLowerCase()],
      );
      callback(allowed ? null : new Error('Invalid image type'), allowed);
    },
  };
}

async function storeRequestPhotos(
  requestId: number,
  kind: 'before' | 'after',
  files: any[],
) {
  const stored: StoredMedia[] = [];
  try {
    for (const file of Array.isArray(files) ? files : []) {
      if (!file?.buffer) continue;
      stored.push(
        await storeUploadedImage(
          file.buffer,
          ['requests', String(requestId), kind],
          `/uploads/requests/${requestId}/${kind}`,
          `request_${requestId}_${kind}`,
          { createThumbnail: false },
        ),
      );
    }
    return stored;
  } catch (error) {
    await deleteStoredMedia(...stored.map((photo) => photo.storageKey));
    throw error;
  }
}

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}


  @UseGuards(JwtAuthGuard)
  @Post('draft')
  async draft(@Req() req: any, @Body() dto: RequestDraftDto) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.draftRequest(dto.prompt, dto.address);
  }
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateRequestDto) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.create(dto, Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/media/before')
  @UseInterceptors(
    FilesInterceptor('images', 20, requestMediaUploadOptions()),
  )
  async uploadBeforeMedia(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: any[],
  ) {
    if (req.user?.role !== 'client') {
      throw new BadRequestException('Client only');
    }

    const requestId = Number(id);
    if (!requestId || !files?.length) throw new BadRequestException('No images');
    const stored = await storeRequestPhotos(requestId, 'before', files);
    const photos = stored.map((photo) => ({
      url: photo.url,
      storageKey: photo.storageKey,
      mimeType: photo.mimeType,
      sizeBytes: photo.sizeBytes,
    }));

    try {
      return await this.requests.addBeforeMedia(
        requestId,
        Number(req.user.id),
        photos,
      );
    } catch (error) {
      await deleteStoredMedia(...stored.map((photo) => photo.storageKey));
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/media/after')
  @UseInterceptors(
    FilesInterceptor('images', 20, requestMediaUploadOptions()),
  )
  async uploadAfterMedia(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: any[],
  ) {
    if (req.user?.role !== 'worker') {
      throw new BadRequestException('Worker only');
    }

    const requestId = Number(id);
    if (!requestId || !files?.length) throw new BadRequestException('No images');
    const stored = await storeRequestPhotos(requestId, 'after', files);
    const photos = stored.map((photo) => ({
      url: photo.url,
      storageKey: photo.storageKey,
      mimeType: photo.mimeType,
      sizeBytes: photo.sizeBytes,
    }));

    try {
      return await this.requests.addAfterMedia(
        requestId,
        Number(req.user.id),
        photos,
      );
    } catch (error) {
      await deleteStoredMedia(...stored.map((photo) => photo.storageKey));
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('client')
  async myRequests(@Req() req: any, @Query('scope') scope?: string) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    if (scope === 'history') return this.requests.getHistoryByClientUserId(Number(req.user.id));
    return this.requests.getByClientUserId(Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('map')
  async mapRequests(@Req() req: any) {
    return this.requests.getMapRequests(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('worker')
  async workerFeed(@Req() req: any, @Query('scope') scope?: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    if (scope === 'history') return this.requests.getCompletedForWorker(Number(req.user.id));
    return this.requests.getForWorkersFeed(Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  async apply(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.applyToRequest(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/withdraw')
  async withdraw(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.withdrawApplication(Number(id), Number(req.user.id));
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/worker-confirm')
  async workerConfirm(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.workerConfirm(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/on-site')
  async onSite(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.markWorkerOnSite(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/inspect')
  async inspect(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.markInspected(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  async startWork(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.startWork(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/finish')
  async finishWork(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.finishWork(Number(id), Number(req.user.id), body?.afterPhotos || []);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/ready')
  async readyForClient(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.readyForClientConfirmation(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/client-confirm')
  async clientConfirm(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.requests.clientConfirmWork(Number(id), Number(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  async complete(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    return this.requests.completeRequest(Number(id), Number(req.user.id), body?.afterPhotos || []);
  }
}

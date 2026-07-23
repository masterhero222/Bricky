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
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestDraftDto } from './dto/request-draft.dto';

const REQUEST_MEDIA_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function requestMediaStorage(kind: 'before' | 'after') {
  return diskStorage({
    destination: (req, file, callback) => {
      const requestId = Number((req as any)?.params?.id);
      const directory = join(
        process.cwd(),
        'uploads',
        'requests',
        requestId > 0 ? String(requestId) : 'invalid',
        kind,
      );
      if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
      callback(null, directory);
    },
    filename: (req: any, file, callback) => {
      const requestId = Number(req?.params?.id) || 'invalid';
      const extension =
        REQUEST_MEDIA_MIME_EXTENSIONS[String(file.mimetype || '').toLowerCase()] ||
        '.jpg';
      callback(
        null,
        `request_${requestId}_${kind}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}${extension}`,
      );
    },
  });
}

function requestMediaUploadOptions(kind: 'before' | 'after') {
  return {
    storage: requestMediaStorage(kind),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req: any, file: any, callback: any) => {
      const allowed = Boolean(
        REQUEST_MEDIA_MIME_EXTENSIONS[String(file.mimetype || '').toLowerCase()],
      );
      callback(allowed ? null : new Error('Invalid image type'), allowed);
    },
  };
}

function uploadedRequestPhotos(
  requestId: number,
  kind: 'before' | 'after',
  files: any[],
) {
  return (Array.isArray(files) ? files : [])
    .filter((file) => file?.filename)
    .map((file) => ({
      url: `/uploads/requests/${requestId}/${kind}/${file.filename}`,
      storageKey: `requests/${requestId}/${kind}/${file.filename}`,
      mimeType: file.mimetype || null,
      sizeBytes: Number(file.size) || null,
    }));
}

function removeUploadedFiles(files: any[]) {
  for (const file of Array.isArray(files) ? files : []) {
    if (!file?.path || !existsSync(file.path)) continue;
    try {
      unlinkSync(file.path);
    } catch {
      // A failed cleanup must not hide the original request error.
    }
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
    FilesInterceptor('images', 20, requestMediaUploadOptions('before')),
  )
  async uploadBeforeMedia(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: any[],
  ) {
    if (req.user?.role !== 'client') {
      removeUploadedFiles(files);
      throw new BadRequestException('Client only');
    }

    const requestId = Number(id);
    const photos = uploadedRequestPhotos(requestId, 'before', files);
    if (!requestId || !photos.length) {
      removeUploadedFiles(files);
      throw new BadRequestException('No images');
    }

    try {
      return await this.requests.addBeforeMedia(
        requestId,
        Number(req.user.id),
        photos,
      );
    } catch (error) {
      removeUploadedFiles(files);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/media/after')
  @UseInterceptors(
    FilesInterceptor('images', 20, requestMediaUploadOptions('after')),
  )
  async uploadAfterMedia(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: any[],
  ) {
    if (req.user?.role !== 'worker') {
      removeUploadedFiles(files);
      throw new BadRequestException('Worker only');
    }

    const requestId = Number(id);
    const photos = uploadedRequestPhotos(requestId, 'after', files);
    if (!requestId || !photos.length) {
      removeUploadedFiles(files);
      throw new BadRequestException('No images');
    }

    try {
      return await this.requests.addAfterMedia(
        requestId,
        Number(req.user.id),
        photos,
      );
    } catch (error) {
      removeUploadedFiles(files);
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

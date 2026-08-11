import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  UseGuards,
  Req,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateWorkerAppearanceDto } from './dto/update-worker-appearance.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  deleteStoredMedia,
  StoredMedia,
  storeUploadedImage,
} from '../common/media-storage';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  private assertWorkerRole(req: any) {
    if (String(req.user?.role || '') !== 'worker') {
      throw new BadRequestException('Worker only');
    }
  }

  @Post('by-user-ids')
  async getByUserIds(@Body() body: any) {
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    return this.workersService.findByUserIds(ids);
  }

  @Get()
  async getAll() {
    return this.workersService.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);

    let worker: any = await this.workersService.findByUserId(userId, { includeUnapprovedMedia: true });
    if (!worker) {
      worker = await this.workersService.createWorkerProfile({ userId, skills: [] });
    }

    return worker;
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Req() req: any, @Body() data: any) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);
    return this.workersService.updateProfileByUserId(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/appearance')
  async updateMyAppearance(@Req() req: any, @Body() data: UpdateWorkerAppearanceDto) {
    if (String(req.user?.role || '') !== 'worker') {
      throw new ForbiddenException('Worker role required');
    }

    const userId = Number(req.user.id);
    return this.workersService.updateAppearanceByUserId(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ok = /(jpg|jpeg|png|webp)$/i.test(file.mimetype);
        cb(ok ? null : new Error('Invalid file type'), ok);
      },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);
    if (!file?.buffer) {
      return this.workersService.findByUserId(userId);
    }
    const stored = await storeUploadedImage(
      file.buffer,
      ['users', String(userId), 'avatar'],
      `/uploads/users/${userId}/avatar`,
      `worker_${userId}`,
      { createThumbnail: false },
    );
    try {
      return await this.workersService.setAvatar(userId, stored.url);
    } catch (error) {
      await deleteStoredMedia(stored.storageKey);
      throw error;
    }
  }

  // =========================
  // ✅ GALLERY (ME)
  // =========================

  @UseGuards(JwtAuthGuard)
  @Get('me/gallery')
  async myGallery(@Req() req: any) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);
    return this.workersService.getGalleryByUserId(userId, { includeUnapprovedMedia: true });
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/gallery')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ok = /(jpg|jpeg|png|webp)$/i.test(file.mimetype);
        cb(ok ? null : new Error('Invalid file type'), ok);
      },
    }),
  )
  async uploadGallery(@Req() req: any, @UploadedFiles() files: any[]) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);

    const list = Array.isArray(files) ? files : [];
    if (!list.length) throw new BadRequestException('No images');

    const stored: StoredMedia[] = [];
    try {
      for (const file of list) {
        stored.push(
          await storeUploadedImage(
          file.buffer,
          ['workers', String(userId), 'gallery'],
          `/uploads/workers/${userId}/gallery`,
          `gallery_${userId}`,
          { createThumbnail: false },
          ),
        );
      }
    } catch (error) {
      await deleteStoredMedia(...stored.map((image) => image.storageKey));
      throw error;
    }
    try {
      return await this.workersService.addGalleryImages(
        userId,
        stored.map((image) => image.url),
      );
    } catch (error) {
      await deleteStoredMedia(...stored.map((image) => image.storageKey));
      throw error;
    }
  }

  // за да работи с твоя apiPost(.../delete)
  @UseGuards(JwtAuthGuard)
  @Post('me/gallery/:id/delete')
  async deleteGallery(@Req() req: any, @Param('id') id: string) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);
    const imageId = Number(id);
    return this.workersService.deleteGalleryImage(userId, imageId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/gallery/reorder')
  async reorderGallery(@Req() req: any, @Body() body: any) {
    this.assertWorkerRole(req);
    return this.workersService.reorderPortfolioMedia(
      Number(req.user.id),
      body?.requestId ? Number(body.requestId) : null,
      body?.mediaIds,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/history')
  async myHistory(@Req() req: any) {
    this.assertWorkerRole(req);
    const userId = Number(req.user.id);
    return this.workersService.getHistoryByUserId(userId);
  }

  @Get(':userId/gallery')
  async publicGallery(@Param('userId') userId: string) {
    const worker = await this.workersService.findOneSmart(Number(userId));
    return this.workersService.getGalleryByUserId(Number(worker.userId));
  }

  @Get(':userId/history')
  async publicHistory(@Param('userId') userId: string) {
    const worker = await this.workersService.findOneSmart(Number(userId));
    return this.workersService.getHistoryByUserId(Number(worker.userId));
  }

  // IMPORTANT: here param is userId (from users table)
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');
    return this.workersService.findOneSmart(uid);
  }
}

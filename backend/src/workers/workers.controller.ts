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
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { getUploadPath } from '../common/storage-paths';
import { processUploadedImage } from '../common/image-processing';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

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
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    const userId = Number(req.user.id);

    let worker = await this.workersService.findByUserId(userId);
    if (!worker) {
      worker = await this.workersService.createWorkerProfile({ userId, skills: [] });
    }

    return worker;
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Req() req: any, @Body() data: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    const userId = Number(req.user.id);
    return this.workersService.updateProfileByUserId(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ok = /(jpg|jpeg|png|webp)$/i.test(file.mimetype);
        cb(ok ? null : new Error('Invalid file type'), ok);
      },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    const userId = Number(req.user.id);
    if (!file?.buffer) {
      return this.workersService.findByUserId(userId);
    }
    const optimized = await processUploadedImage(file.buffer);
    const dir = getUploadPath('workers');
    await mkdir(dir, { recursive: true });
    const stem = `worker_${userId}_${randomUUID()}`;
    await Promise.all([
      writeFile(join(dir, `${stem}.webp`), optimized.photo),
      writeFile(join(dir, `${stem}_thumb.webp`), optimized.thumbnail),
    ]);
    return this.workersService.updateProfileByUserId(userId, {
      avatarUrl: `/uploads/workers/${stem}.webp`,
      avatarThumbnailUrl: `/uploads/workers/${stem}_thumb.webp`,
    });
  }

  // =========================
  // ✅ GALLERY (ME)
  // =========================

  @UseGuards(JwtAuthGuard)
  @Get('me/gallery')
  async myGallery(@Req() req: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    const userId = Number(req.user.id);
    return this.workersService.getGalleryByUserId(userId, true);
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
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    const userId = Number(req.user.id);

    const list = Array.isArray(files) ? files : [];
    if (!list.length) throw new BadRequestException('No images');

    const dir = getUploadPath('workers', 'gallery');
    await mkdir(dir, { recursive: true });
    const images: Array<{ url: string; thumbnailUrl: string; storageKey: string; thumbnailStorageKey: string }> = [];
    for (const file of list) {
      const optimized = await processUploadedImage(file.buffer);
      const stem = `gallery_${userId}_${randomUUID()}`;
      await Promise.all([
        writeFile(join(dir, `${stem}.webp`), optimized.photo),
        writeFile(join(dir, `${stem}_thumb.webp`), optimized.thumbnail),
      ]);
      images.push({
        url: `/uploads/workers/gallery/${stem}.webp`,
        thumbnailUrl: `/uploads/workers/gallery/${stem}_thumb.webp`,
        storageKey: `workers/gallery/${stem}.webp`,
        thumbnailStorageKey: `workers/gallery/${stem}_thumb.webp`,
      });
    }
    return this.workersService.addGalleryImages(userId, images);
  }

  // за да работи с твоя apiPost(.../delete)
  @UseGuards(JwtAuthGuard)
  @Post('me/gallery/:id/delete')
  async deleteGallery(@Req() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
    const userId = Number(req.user.id);
    const imageId = Number(id);
    return this.workersService.deleteGalleryImage(userId, imageId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/history')
  async myHistory(@Req() req: any) {
    if (req.user?.role !== 'worker') throw new BadRequestException('Worker only');
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

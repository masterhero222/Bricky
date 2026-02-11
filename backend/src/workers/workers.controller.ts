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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
    const userId = Number(req.user.id);
    return this.workersService.updateProfileByUserId(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'workers');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req: any, file, cb) => {
          const userId = req?.user?.id ?? 'unknown';
          const safeExt = extname(file.originalname || '').toLowerCase() || '.jpg';
          const name = `worker_${userId}_${Date.now()}${safeExt}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ok = /(jpg|jpeg|png|webp)$/i.test(file.mimetype);
        cb(ok ? null : new Error('Invalid file type'), ok);
      },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    const userId = Number(req.user.id);
    if (!file?.filename) {
      return this.workersService.findByUserId(userId);
    }
    const avatarUrl = `/uploads/workers/${file.filename}`;
    return this.workersService.updateProfileByUserId(userId, { avatarUrl });
  }

  // =========================
  // ✅ GALLERY (ME)
  // =========================

  @UseGuards(JwtAuthGuard)
  @Get('me/gallery')
  async myGallery(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.workersService.getGalleryByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/gallery')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'workers', 'gallery');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req: any, file, cb) => {
          const userId = req?.user?.id ?? 'unknown';
          const safeExt = extname(file.originalname || '').toLowerCase() || '.jpg';
          const name = `gallery_${userId}_${Date.now()}_${Math.floor(Math.random() * 999999)}${safeExt}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ok = /(jpg|jpeg|png|webp)$/i.test(file.mimetype);
        cb(ok ? null : new Error('Invalid file type'), ok);
      },
    }),
  )
  async uploadGallery(@Req() req: any, @UploadedFiles() files: any[]) {
    const userId = Number(req.user.id);

    const list = Array.isArray(files) ? files : [];
    if (!list.length) throw new BadRequestException('No images');

    const urls = list
      .map((f) => (f?.filename ? `/uploads/workers/gallery/${f.filename}` : null))
      .filter(Boolean);

    return this.workersService.addGalleryImages(userId, urls as string[]);
  }

  // за да работи с твоя apiPost(.../delete)
  @UseGuards(JwtAuthGuard)
  @Post('me/gallery/:id/delete')
  async deleteGallery(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id);
    const imageId = Number(id);
    return this.workersService.deleteGalleryImage(userId, imageId);
  }

  // =========================
  // ✅ GALLERY (PUBLIC) for WorkerPreview
  // =========================
  @Get(':userId/gallery')
  async galleryByUserId(@Param('userId') userId: string) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');
    return this.workersService.getGalleryByUserId(uid);
  }

  // IMPORTANT: here param is userId (from users table)
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');
    return this.workersService.findByUserId(uid);
  }
}

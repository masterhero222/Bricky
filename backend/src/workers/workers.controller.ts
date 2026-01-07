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
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
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

  // IMPORTANT: here param is userId (from users table)
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Invalid userId');
    return this.workersService.findByUserId(uid);
  }
}

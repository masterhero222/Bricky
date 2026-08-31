import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { accessSync, constants, existsSync, mkdirSync } from 'fs';
import { getCorsOrigins, validateRuntimeConfig } from './config/runtime-config';
import { getUploadsRoot } from './common/storage-paths';

async function bootstrap() {
  validateRuntimeConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '1mb' });
  app.set('trust proxy', 1);

  const uploadsDir = getUploadsRoot();
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  accessSync(uploadsDir, constants.R_OK | constants.W_OK);

  // serve /uploads/*
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  app.enableCors({
    origin: getCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Глобална валидация
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const PORT = Number(process.env.PORT) || 3000;
  await app.listen(PORT, '0.0.0.0');

  console.log(`Backend is running on port ${PORT}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Backend startup failed', error);
  process.exitCode = 1;
});

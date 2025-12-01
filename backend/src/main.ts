import * as dotenv from 'dotenv';
dotenv.config({ path: '/var/www/Bricky/backend/.env' });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS за фронтенда
  app.enableCors({
    origin: [
      'http://bricky.bg',
      'https://bricky.bg',
      'http://94.72.143.22',
      'https://94.72.143.22'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Глобална валидация
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const PORT = Number(process.env.PORT) || 3000;
  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Backend is running on port ${PORT}`);
}

bootstrap();

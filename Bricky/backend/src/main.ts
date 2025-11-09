import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS към фронтенда
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Глобална валидация
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(PORT);
  console.log(`🚀 Backend is running on http://localhost:${PORT}`);
}

bootstrap();

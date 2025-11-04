import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🧩 Разрешаваме CORS за фронтенда (5173)
  app.enableCors({
    origin: 'http://localhost:5173', // позволяваме фронтенда
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3000);
  console.log('🚀 Backend is running on http://localhost:3000');
}
bootstrap();

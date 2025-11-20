import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Разрешаваме CORS за реалния сайт и за локален тест
  app.enableCors({
    origin: [
      'http://94.72.143.22', // фронтендът на сървъра
      'http://bricky.bg', 
      
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Глобална валидация
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(PORT, '0.0.0.0'); // ✅ Слуша на всички IP адреси, не само localhost

  console.log(`🚀 Backend is running on http://94.72.143.22:${PORT}`);
}

bootstrap();

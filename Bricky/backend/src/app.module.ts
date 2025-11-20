import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { RequestsModule } from './requests/requests.module';
import { Request } from './requests/entities/request.entity';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    // 🧩 Зареждаме .env глобално
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🧱 MySQL
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: +process.env.DB_PORT! || 3306,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'root',
      database: process.env.DB_NAME || 'bricky_db',
      autoLoadEntities: true,
      synchronize: true,
    }),

    // ✉️ Mailer (от .env)
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: +process.env.MAIL_PORT!,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
      defaults: {
        from: process.env.MAIL_FROM,
      },
    }),

    // 🧩 Модулите
    RequestsModule,
    WorkersModule,
  ],
})
export class AppModule {}

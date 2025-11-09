// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

import { RequestsModule } from './requests/requests.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 3306),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'bricky',
      autoLoadEntities: true,
      synchronize: true,
    }),

    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: +(process.env.MAIL_PORT || 587),
        secure: false,
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      },
      defaults: { from: process.env.MAIL_FROM },
      template: {
        dir: join(__dirname, 'mail', 'templates'),
        adapter: new HandlebarsAdapter(),       // 👈 важната част
        options: { strict: true },
      },
    }),

    RequestsModule,
    WorkersModule,
  ],
})
export class AppModule {}

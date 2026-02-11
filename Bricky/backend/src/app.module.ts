import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { RequestsModule } from './requests/requests.module';
import { WorkersModule } from './workers/workers.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewModule } from './reviews/review.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    UsersModule,
    AuthModule,
    ReviewModule,
    MailModule,
    NotificationsModule,
    RequestsModule,
    WorkersModule,
  ],
})
export class AppModule {}

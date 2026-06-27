import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RequestEntity } from './entities/request.entity';
import { RequestApplicationEntity } from './entities/request-application.entity';
import { RequestImageEntity } from './entities/request-image.entity';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { WorkersModule } from '../workers/workers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestEntity, RequestApplicationEntity, RequestImageEntity]),
    MailModule,
    AuthModule,
    WorkersModule,
    NotificationsModule, // ✅ важно
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}

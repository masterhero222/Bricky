import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RequestEntity } from './entities/request.entity';
import { RepairRequestEntity } from './entities/repair-request.entity';
import { RequestApplicationEntity } from './entities/request-application.entity';
import { RequestImageEntity } from './entities/request-image.entity';
import { RequestEventEntity } from './entities/request-event.entity';
import { RequestPricingSnapshotEntity } from './entities/request-pricing-snapshot.entity';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestLifecycleService } from './request-lifecycle.service';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { WorkersModule } from '../workers/workers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MediaModule } from '../media/media.module';
import { UserEntity } from '../users/user.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestEntity,
      RepairRequestEntity,
      RequestApplicationEntity,
      RequestImageEntity,
      RequestEventEntity,
      RequestPricingSnapshotEntity,
      UserEntity,
      WorkerProfileEntity,
    ]),
    MailModule,
    AuthModule,
    WorkersModule,
    NotificationsModule,
    MediaModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService, RequestLifecycleService],
  exports: [RequestsService, RequestLifecycleService],
})
export class RequestsModule {}

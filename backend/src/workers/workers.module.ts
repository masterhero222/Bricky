import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from './worker.entity';
import { WorkerGalleryImage } from './worker-gallery-image.entity';
import { WorkerProfileEntity } from './worker-profile.entity';
import { WorkerSkillEntity } from './worker-skill.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { ReferralRewardEntity } from '../referrals/referral-reward.entity';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { WorkerProfileCompletionService } from './worker-profile-completion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Worker,
      WorkerGalleryImage,
      WorkerProfileEntity,
      WorkerSkillEntity,
      RepairRequestEntity,
      ReferralRewardEntity,
    ]),
    UsersModule,
    MailModule,
    MediaModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService, WorkerProfileCompletionService],
  exports: [
    TypeOrmModule, // важно за RequestsModule ако import-ва WorkersModule
    WorkersService,
  ],
})
export class WorkersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { ClientProfileEntity } from './client-profile.entity';
import { UsersService } from './users.service';
import { ClientController } from './client.controller';
import { AccountController } from './account.controller';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { NotificationEntity } from '../notifications/notification.entity';
import { WorkerPlanEntity } from '../billing/worker-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ClientProfileEntity,
      WorkerProfileEntity,
      NotificationEntity,
      WorkerPlanEntity,
    ]),
  ],
  controllers: [ClientController, AccountController],
  providers: [UsersService],
  exports: [UsersService], // важно за AuthService
})
export class UsersModule {}

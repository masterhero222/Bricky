import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { ClientProfileEntity } from './client-profile.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ClientProfileEntity])],
  providers: [UsersService],
  exports: [UsersService], // важно за AuthService
})
export class UsersModule {}

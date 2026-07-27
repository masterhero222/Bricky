import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { ClientProfileEntity } from './client-profile.entity';
import { UsersService } from './users.service';
import { ClientController } from './client.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ClientProfileEntity])],
  controllers: [ClientController],
  providers: [UsersService],
  exports: [UsersService], // важно за AuthService
})
export class UsersModule {}

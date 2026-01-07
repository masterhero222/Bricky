import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from './worker.entity';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Worker]),
    UsersModule,
    MailModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [
    TypeOrmModule, // важно за RequestsModule ако import-ва WorkersModule
    WorkersService,
  ],
})
export class WorkersModule {}

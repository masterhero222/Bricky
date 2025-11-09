// src/workers/workers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { Worker } from './worker.entity';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Worker]),
    MailerModule, // 👈 добавено
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}

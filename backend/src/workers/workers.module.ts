// src/workers/workers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from './worker.entity';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { MailModule } from '../mail/mail.module';



@Module({
  imports: [
    TypeOrmModule.forFeature([Worker]),
	MailModule,
   
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RequestEntity } from './entities/request.entity';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestEntity]),
    MailModule,
    AuthModule, // <-- ЕТО ГО! ТУК ТРЯБВА ДА Е.
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReviewEntity } from './entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { RequestEventEntity } from '../requests/entities/request-event.entity';
import { RequestLifecycleService } from '../requests/request-lifecycle.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      RepairRequestEntity,
      RequestEventEntity,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, RequestLifecycleService],
  exports: [ReviewsService],
})
export class ReviewModule {}

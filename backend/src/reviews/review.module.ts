import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReviewEntity } from './entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { RequestEntity } from '../requests/entities/request.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity, RequestEntity, RepairRequestEntity]), ReferralsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewModule {}

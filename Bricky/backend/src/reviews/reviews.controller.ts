import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // ✅ client leaves review
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateReviewDto) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.reviews.createReview(dto, Number(req.user.id));
  }

  // ✅ client: list my reviews (so frontend knows which requests are already rated)
  @UseGuards(JwtAuthGuard)
  @Get('client')
  async myReviews(@Req() req: any) {
    if (req.user?.role !== 'client') throw new BadRequestException('Client only');
    return this.reviews.getByClient(Number(req.user.id));
  }

  // ✅ public: worker reviews + avg
  @Get('worker/:workerUserId')
  async getByWorker(@Param('workerUserId') workerUserId: string) {
    return this.reviews.getByWorker(Number(workerUserId));
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { ContentReportEntity } from './content-report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentReportEntity,
      WorkerProfileEntity,
      RepairRequestEntity,
      MediaAssetEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

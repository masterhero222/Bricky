import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { RepairRequestEntity } from '../requests/entities/repair-request.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { CreateContentReportDto } from './dto/create-content-report.dto';
import { ContentReportEntity } from './content-report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ContentReportEntity)
    private readonly reports: Repository<ContentReportEntity>,
    @InjectRepository(WorkerProfileEntity)
    private readonly workers: Repository<WorkerProfileEntity>,
    @InjectRepository(RepairRequestEntity)
    private readonly requests: Repository<RepairRequestEntity>,
    @InjectRepository(MediaAssetEntity)
    private readonly media: Repository<MediaAssetEntity>,
  ) {}

  async create(reporterUserId: number, dto: CreateContentReportDto) {
    await this.assertTargetExists(dto.targetType, dto.targetId);
    if (
      dto.targetType === 'worker_profile' &&
      dto.targetId === reporterUserId
    ) {
      throw new BadRequestException(
        'Не можете да сигнализирате собствения си профил',
      );
    }
    const duplicate = await this.reports.findOne({
      where: {
        reporterUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'open',
      },
    });
    if (duplicate) return { ok: true, reportId: duplicate.id, duplicate: true };

    const report = await this.reports.save(
      this.reports.create({
        reporterUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        category: dto.category,
        details: dto.details?.trim() || null,
        status: 'open',
        resolutionNote: null,
        resolvedByUserId: null,
        resolvedAt: null,
      }),
    );
    return { ok: true, reportId: report.id, duplicate: false };
  }

  list(status?: string) {
    return this.reports.find({
      where: status ? { status: status as ContentReportEntity['status'] } : {},
      order: { createdAt: 'DESC' },
      take: 250,
    });
  }

  async resolve(id: number, adminUserId: number, status: string, note: string) {
    if (!['reviewing', 'resolved', 'dismissed'].includes(status)) {
      throw new BadRequestException('Невалиден статус на сигнала');
    }
    if (!note?.trim())
      throw new BadRequestException('Бележката е задължителна');
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Сигналът не е намерен');
    report.status = status as ContentReportEntity['status'];
    report.resolutionNote = note.trim();
    report.resolvedByUserId = adminUserId;
    report.resolvedAt = status === 'reviewing' ? null : new Date();
    return this.reports.save(report);
  }

  private async assertTargetExists(
    type: CreateContentReportDto['targetType'],
    id: number,
  ) {
    const target =
      type === 'worker_profile'
        ? await this.workers.findOne({ where: { userId: id } })
        : type === 'request'
          ? await this.requests.findOne({ where: { id } })
          : await this.media.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Съдържанието не е намерено');
  }
}

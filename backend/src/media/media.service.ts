import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { MediaAssetEntity } from './media-asset.entity';

type CreateMediaAssetInput = {
  ownerUserId: number;
  requestId?: number | null;
  workerUserId?: number | null;
  kind: string;
  storageKey: string;
  publicUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  moderationStatus?: string;
};

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly mediaRepo: Repository<MediaAssetEntity>,
  ) {}

  async createAsset(input: CreateMediaAssetInput) {
    if (this.isInlineDataUrl(input.publicUrl) || this.isInlineDataUrl(input.storageKey)) {
      throw new BadRequestException('Inline data URLs are not allowed in production media storage');
    }

    return this.mediaRepo.save(
      this.mediaRepo.create({
        ownerUserId: input.ownerUserId,
        requestId: input.requestId ?? null,
        workerUserId: input.workerUserId ?? null,
        kind: input.kind,
        storageProvider: 'vps',
        storageKey: input.storageKey,
        publicUrl: input.publicUrl,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        moderationStatus: input.moderationStatus ?? 'pending',
      }),
    );
  }

  async findByRequest(requestId: number) {
    return this.mediaRepo.find({
      where: { requestId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByWorker(workerUserId: number) {
    return this.mediaRepo.find({
      where: { workerUserId },
      order: { createdAt: 'DESC' },
    });
  }

  async listAll() {
    return this.mediaRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  async setModerationStatus(id: number, moderationStatus: string) {
    await this.mediaRepo.update({ id }, { moderationStatus });
    const media = await this.mediaRepo.findOne({ where: { id } });

    const avatarWorkerUserId = media?.workerUserId || media?.ownerUserId;

    if (media?.kind === 'worker_avatar' && moderationStatus === 'approved' && avatarWorkerUserId) {
      await this.mediaRepo.update(
        {
          id: Not(media.id),
          workerUserId: avatarWorkerUserId,
          kind: 'worker_avatar',
          moderationStatus: 'approved',
        },
        { moderationStatus: 'rejected' },
      );
      await this.mediaRepo.update(
        {
          id: Not(media.id),
          ownerUserId: avatarWorkerUserId,
          kind: 'worker_avatar',
          moderationStatus: 'approved',
        },
        { moderationStatus: 'rejected' },
      );
    }

    return media;
  }

  async setRequestMediaModeration(requestId: number, kind: string, moderationStatus: string) {
    await this.mediaRepo.update({ requestId, kind }, { moderationStatus });
    return this.findByRequest(requestId);
  }

  async deleteAsset(id: number) {
    await this.mediaRepo.delete({ id });
    return { ok: true };
  }

  private isInlineDataUrl(value: any) {
    return /^data:/i.test(String(value || '').trim());
  }
}

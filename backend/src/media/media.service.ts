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
  displayOrder?: number | null;
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
        displayOrder: input.displayOrder ?? null,
      }),
    );
  }

  async findByRequest(requestId: number) {
    const rows = await this.mediaRepo.find({
      where: { requestId },
      order: { createdAt: 'ASC' },
    });
    return this.sortByDisplayOrder(rows, 'ASC');
  }

  async findByWorker(workerUserId: number) {
    const rows = await this.mediaRepo.find({
      where: { workerUserId },
      order: { createdAt: 'DESC' },
    });
    return this.sortByDisplayOrder(rows, 'DESC');
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

  async setDisplayOrder(assetIds: number[]) {
    await this.mediaRepo.manager.transaction(async (manager) => {
      for (const [displayOrder, id] of assetIds.entries()) {
        await manager.update(MediaAssetEntity, { id }, { displayOrder });
      }
    });

    return { ok: true };
  }

  private isInlineDataUrl(value: any) {
    return /^data:/i.test(String(value || '').trim());
  }

  private sortByDisplayOrder(rows: MediaAssetEntity[], fallbackDirection: 'ASC' | 'DESC') {
    return rows.sort((left, right) => {
      const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      const delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return fallbackDirection === 'ASC' ? delta : -delta;
    });
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  async create(
    userId: number,
    payload: { type: string; message: string; requestId?: number | null },
  ) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Missing userId');

    const row = this.repo.create({
      userId: uid,
      type: payload.type,
      message: payload.message,
      requestId: payload.requestId ?? null,
      isRead: false,
    });

    return this.repo.save(row);
  }

  async getMy(userId: number) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestException('Missing userId');

    return this.repo.find({
      where: { userId: uid },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(userId: number, id: number) {
    const uid = Number(userId);
    const nid = Number(id);
    if (!uid) throw new BadRequestException('Missing userId');
    if (!nid) throw new BadRequestException('Invalid notification id');

    await this.repo.update({ id: nid, userId: uid }, { isRead: true });
    return { ok: true };
  }
}

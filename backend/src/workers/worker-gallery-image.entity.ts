import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import type { ModerationStatus } from '../moderation/moderation.types';

@Entity('worker_gallery_images')
export class WorkerGalleryImage {
  @PrimaryGeneratedColumn()
  id: number;

  // users.id
  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number;

  // /uploads/workers/gallery/....
  @Column({ type: 'varchar', length: 255, nullable: false })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  storageKey: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailStorageKey: string | null;

  @Column({ type: 'varchar', length: 30, default: 'pending_review' })
  moderationStatus: ModerationStatus;

  @Column({ type: 'text', nullable: true })
  moderationReason: string | null;

  @Column({ type: 'int', nullable: true })
  moderatedByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  moderatedAt: Date | null;

  @CreateDateColumn()
  created_at: Date;
}

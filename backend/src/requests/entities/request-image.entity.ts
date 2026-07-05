import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { ModerationStatus } from '../../moderation/moderation.types';

export type RequestImageKind = 'general' | 'before' | 'after';

@Entity('request_images')
export class RequestImageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  requestId: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  uploaderUserId: number | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ['general', 'before', 'after'],
    default: 'general',
  })
  kind: RequestImageKind;

  @Column({ type: 'varchar', length: 180, nullable: true })
  name: string | null;

  @Column({ type: 'longtext' })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  storageKey: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType: string | null;

  @Column({ type: 'int', nullable: true })
  sizeBytes: number | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isApproved: boolean;

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

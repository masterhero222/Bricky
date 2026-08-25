import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import type { ModerationStatus } from '../../moderation/moderation.types';

@Entity('repair_request_reviews')
@Index(['requestId', 'clientUserId'], { unique: true })
export class ReviewEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id', type: 'int' })
  requestId: number;

  @Column({ name: 'worker_user_id', type: 'int' })
  workerUserId: number;

  @Column({ name: 'client_user_id', type: 'int' })
  clientUserId: number;

  @Column({ type: 'int' })
  rating: number; // 1..5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'completed_by_worker_id', type: 'int', nullable: true })
  completedByWorkerId: number | null;

  @Column({ type: 'varchar', length: 30, default: 'pending_review' })
  moderationStatus: ModerationStatus;

  @Column({ type: 'text', nullable: true })
  moderationReason: string | null;

  @Column({ type: 'int', nullable: true })
  moderatedByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  moderatedAt: Date | null;

}

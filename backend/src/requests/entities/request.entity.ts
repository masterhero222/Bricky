import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';
import type { ModerationStatus } from '../../moderation/moderation.types';

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'clientId' })
  client: UserEntity | null;

  @Column({ length: 100 })
  clientName: string;

  @Column({ length: 120 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255, nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  categoryKey: string | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  locationSource: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimateMin: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimateMax: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  estimateCurrency: string | null;

  @Column({ type: 'simple-json', nullable: true })
  photos: any[] | null;

  @Column({ type: 'simple-json', nullable: true })
  beforePhotos: any[] | null;

  @Column({ type: 'simple-json', nullable: true })
  afterPhotos: any[] | null;

  @Column({
    type: 'enum',
    enum: ['нова', 'кандидатствана', 'назначена', 'в процес', 'завършена', 'отказана'],
    default: 'нова',
  })
  status: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  statusKey: string | null;

  @Column({ type: 'datetime', nullable: true })
  workerArrivedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  workStartedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  workReadyAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  clientConfirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  disputedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  disputeReason: string | null;

  @Column('simple-array', { nullable: true })
  appliedWorkers: number[];

  @Column({ type: 'int', nullable: true })
  assignedWorkerId: number | null;

  // ? NEW: completion info
  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  completedByWorkerId: number | null;

  @Column({ type: 'int', nullable: true })
  durationDays: number | null;

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


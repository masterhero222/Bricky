import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';

export type RepairRequestStatus =
  | 'draft'
  | 'published'
  | 'applied'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'archived';

@Entity('repair_requests')
export class RepairRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'client_user_id', type: 'int' })
  clientUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_user_id' })
  client: UserEntity;

  @Index()
  @Column({ name: 'category_key', length: 80 })
  categoryKey: string;

  @Column({ length: 180 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'address_text', length: 255, nullable: true })
  addressText: string | null;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({ name: 'location_source', length: 50, nullable: true })
  locationSource: string | null;

  @Column({ name: 'address_visibility', default: 'exact_after_assignment' })
  addressVisibility: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'applied', 'assigned', 'in_progress', 'completed', 'canceled', 'archived'],
    default: 'published',
  })
  status: RepairRequestStatus;

  @Column({ name: 'estimate_min', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimateMin: string | null;

  @Column({ name: 'estimate_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimateMax: string | null;

  @Column({ name: 'estimate_currency', length: 30, default: 'EUR' })
  estimateCurrency: string;

  @Column({ name: 'pricing_snapshot_id', type: 'int', nullable: true })
  pricingSnapshotId: number | null;

  @Index()
  @Column({ name: 'assigned_worker_user_id', type: 'int', nullable: true })
  assignedWorkerUserId: number | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

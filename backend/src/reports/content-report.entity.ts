import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('content_reports')
@Index(['targetType', 'targetId'])
export class ContentReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'reporter_user_id', type: 'int' })
  reporterUserId: number;

  @Column({ name: 'target_type', type: 'varchar', length: 40 })
  targetType: 'worker_profile' | 'request' | 'media';

  @Column({ name: 'target_id', type: 'int' })
  targetId: number;

  @Column({ type: 'varchar', length: 40 })
  category: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Index()
  @Column({ type: 'varchar', length: 24, default: 'open' })
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ name: 'resolved_by_user_id', type: 'int', nullable: true })
  resolvedByUserId: number | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

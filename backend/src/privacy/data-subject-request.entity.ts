import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { PrivacyRequestStatus, PrivacyRequestType } from './privacy.constants';

@Entity('data_subject_requests')
export class DataSubjectRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Index()
  @Column({ name: 'request_type', type: 'varchar', length: 30 })
  requestType: PrivacyRequestType;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'submitted' })
  status: PrivacyRequestStatus;

  @Column({ type: 'text' })
  details: string;

  @Column({ name: 'response_notes', type: 'text', nullable: true })
  responseNotes: string | null;

  @Column({ name: 'due_at', type: 'datetime' })
  dueAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

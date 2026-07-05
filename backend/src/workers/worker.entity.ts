import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import type { ModerationStatus } from '../moderation/moderation.types';

@Entity('worker')
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  // връзка към users.id (важно за JWT "me")
  @Index({ unique: true })
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ nullable: true })
  fullName: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column('simple-array', { nullable: true })
  skills: string[];

  // NEW PROFILE FIELDS
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  experience: string;

  @Column({ type: 'text', nullable: true })
  equipment: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ type: 'varchar', length: 30, default: 'pending_review' })
  moderationStatus: ModerationStatus;

  @Column({ type: 'text', nullable: true })
  moderationReason: string | null;

  @Column({ type: 'int', nullable: true })
  moderatedByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  moderatedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: 'pending_review' })
  avatarModerationStatus: ModerationStatus;

  @Column({ type: 'text', nullable: true })
  avatarModerationReason: string | null;

  @Column({ type: 'int', nullable: true })
  avatarModeratedByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  avatarModeratedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReferralType = 'worker_to_worker' | 'client_to_client';
export type ReferralStatus = 'created' | 'registered' | 'qualifying' | 'qualified' | 'rewarded' | 'rejected';

@Entity('referrals')
@Index(['type', 'status'])
export class ReferralEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 24 })
  code: string;

  @Column({ type: 'enum', enum: ['worker_to_worker', 'client_to_client'] })
  type: ReferralType;

  @Index()
  @Column({ name: 'referrer_user_id', type: 'int' })
  referrerUserId: number;

  @Index({ unique: true })
  @Column({ name: 'referred_user_id', type: 'int', nullable: true })
  referredUserId: number | null;

  @Column({
    type: 'enum',
    enum: ['created', 'registered', 'qualifying', 'qualified', 'rewarded', 'rejected'],
    default: 'created',
  })
  status: ReferralStatus;

  @Column({ name: 'qualified_repair_count', type: 'int', default: 0 })
  qualifiedRepairCount: number;

  @Column({ name: 'qualified_at', type: 'datetime', nullable: true })
  qualifiedAt: Date | null;

  @Column({ name: 'rewarded_at', type: 'datetime', nullable: true })
  rewardedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

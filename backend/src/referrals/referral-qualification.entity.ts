import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReferralQualificationStatus = 'pending' | 'qualified' | 'revoked';

@Entity('referral_qualifications')
@Index(['referralId', 'requestId'], { unique: true })
export class ReferralQualificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'referral_id', type: 'int' })
  referralId: number;

  @Index({ unique: true })
  @Column({ name: 'request_id', type: 'int' })
  requestId: number;

  @Index()
  @Column({ name: 'referred_worker_user_id', type: 'int' })
  referredWorkerUserId: number;

  @Index()
  @Column({ name: 'client_user_id', type: 'int' })
  clientUserId: number;

  @Column({ type: 'enum', enum: ['pending', 'qualified', 'revoked'], default: 'qualified' })
  status: ReferralQualificationStatus;

  @Column({ name: 'qualified_at', type: 'datetime', nullable: true })
  qualifiedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

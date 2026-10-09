import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReferralRewardStatus = 'pending' | 'active' | 'expired' | 'revoked';

@Entity('referral_rewards')
@Index(['userId', 'rewardType', 'status'])
export class ReferralRewardEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'referral_id', type: 'int' })
  referralId: number;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'reward_type', length: 80 })
  rewardType: string;

  @Column({ type: 'enum', enum: ['pending', 'active', 'expired', 'revoked'], default: 'active' })
  status: ReferralRewardStatus;

  @Column({ name: 'starts_at', type: 'datetime' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'datetime' })
  endsAt: Date;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

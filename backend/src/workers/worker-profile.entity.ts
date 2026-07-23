import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('worker_profiles')
export class WorkerProfileEntity {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'public_name', length: 140 })
  publicName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'text', nullable: true })
  experience: string | null;

  @Column({ type: 'text', nullable: true })
  equipment: string | null;

  @Column({ name: 'approval_status', default: 'pending' })
  approvalStatus: string;

  @Column({ name: 'visibility_status', default: 'private' })
  visibilityStatus: string;

  @Column({ name: 'profile_banner_key', length: 64, default: 'blueprint_general_v1' })
  profileBannerKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

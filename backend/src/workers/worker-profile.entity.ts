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

  @Column({ name: 'phone_private', type: 'varchar', length: 40, nullable: true })
  phonePrivate: string | null;

  @Column({ name: 'default_address', type: 'varchar', length: 255, nullable: true })
  defaultAddress: string | null;

  @Column({ name: 'approval_status', default: 'pending' })
  approvalStatus: string;

  @Column({ name: 'visibility_status', default: 'private' })
  visibilityStatus: string;

  @Column({ name: 'profile_banner_key', length: 64, default: 'blueprint_general_v1' })
  profileBannerKey: string;

  @Column({ name: 'primary_category_key', type: 'varchar', length: 80, nullable: true })
  primaryCategoryKey: string | null;

  @Column({ name: 'preferred_contact_method', type: 'varchar', length: 30, nullable: true })
  preferredContactMethod: string | null;

  @Column({ name: 'contact_accuracy_confirmed', type: 'boolean', default: false })
  contactAccuracyConfirmed: boolean;

  @Column({ name: 'work_type', type: 'varchar', length: 30, nullable: true })
  workType: string | null;

  @Column({ name: 'experience_range', type: 'varchar', length: 30, nullable: true })
  experienceRange: string | null;

  @Column({ name: 'availability_status', type: 'varchar', length: 30, nullable: true })
  availabilityStatus: string | null;

  @Column({ name: 'acquisition_source_self_reported', type: 'varchar', length: 60, nullable: true })
  acquisitionSourceSelfReported: string | null;

  @Column({ name: 'acquisition_source_detail', type: 'varchar', length: 180, nullable: true })
  acquisitionSourceDetail: string | null;

  @Column({ name: 'project_photos_readiness', type: 'varchar', length: 30, nullable: true })
  projectPhotosReadiness: string | null;

  @Column({ name: 'service_description_readiness', type: 'varchar', length: 20, nullable: true })
  serviceDescriptionReadiness: string | null;

  @Column({ name: 'onboarding_step', type: 'tinyint', default: 1 })
  onboardingStep: number;

  @Column({ name: 'onboarding_completed_at', type: 'datetime', nullable: true })
  onboardingCompletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

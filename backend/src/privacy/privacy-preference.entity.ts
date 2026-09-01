import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('privacy_preferences')
export class PrivacyPreferenceEntity {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'analytics_consent', type: 'boolean', default: false })
  analyticsConsent: boolean;

  @Column({ name: 'marketing_consent', type: 'boolean', default: false })
  marketingConsent: boolean;

  @Column({ name: 'consent_version', type: 'varchar', length: 40 })
  consentVersion: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('request_pricing_snapshots')
export class RequestPricingSnapshotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @Column({ name: 'pricing_version', length: 80, nullable: true })
  pricingVersion: string | null;

  @Column({ length: 10, default: 'EUR' })
  currency: string;

  @Column({ name: 'category_key', length: 80 })
  categoryKey: string;

  @Column({ name: 'activity_keys_json', type: 'json', nullable: true })
  activityKeysJson: string[] | null;

  @Column({ name: 'input_json', type: 'json', nullable: true })
  inputJson: Record<string, any> | null;

  @Column({ name: 'result_json', type: 'json', nullable: true })
  resultJson: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

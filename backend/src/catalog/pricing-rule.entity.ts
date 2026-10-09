import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('pricing_rules')
@Index(['categoryKey', 'activityKey', 'version'], { unique: true })
export class PricingRuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  version: string;

  @Index()
  @Column({ name: 'category_key', length: 80 })
  categoryKey: string;

  @Column({ name: 'activity_key', length: 120 })
  activityKey: string;

  @Column({ name: 'labor_min', type: 'decimal', precision: 10, scale: 2 })
  laborMin: string;

  @Column({ name: 'labor_max', type: 'decimal', precision: 10, scale: 2 })
  laborMax: string;

  @Column({ name: 'material_min', type: 'decimal', precision: 10, scale: 2, nullable: true })
  materialMin: string | null;

  @Column({ name: 'material_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  materialMax: string | null;

  @Column({ length: 10, default: 'EUR' })
  currency: string;

  @Column({ name: 'valid_from', type: 'datetime', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'valid_to', type: 'datetime', nullable: true })
  validTo: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

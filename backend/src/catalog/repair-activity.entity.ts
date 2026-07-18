import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('repair_activities')
@Index(['categoryKey', 'activityKey'], { unique: true })
export class RepairActivityEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'category_key', length: 80 })
  categoryKey: string;

  @Column({ name: 'activity_key', length: 120 })
  activityKey: string;

  @Column({ length: 180 })
  label: string;

  @Column({ name: 'unit_type', length: 40, nullable: true })
  unitType: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}

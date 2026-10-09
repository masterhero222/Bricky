import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('repair_categories')
export class RepairCategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'category_key', length: 80 })
  categoryKey: string;

  @Column({ length: 140 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}

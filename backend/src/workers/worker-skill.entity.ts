import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('worker_skills')
@Index(['workerUserId', 'categoryKey', 'activityKey'], { unique: true })
export class WorkerSkillEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'worker_user_id', type: 'int' })
  workerUserId: number;

  @Index()
  @Column({ name: 'category_key', length: 80 })
  categoryKey: string;

  @Column({ name: 'activity_key', length: 120, nullable: true })
  activityKey: string | null;
}

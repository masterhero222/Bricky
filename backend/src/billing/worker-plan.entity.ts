import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('worker_plans')
export class WorkerPlanEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('uq_worker_plan_worker', { unique: true })
  @Column({ name: 'worker_user_id', type: 'int' })
  workerUserId: number;

  @Column({ name: 'plan_key', length: 80, default: 'free' })
  planKey: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'datetime', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

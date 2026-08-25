import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RequestApplicationStatus = 'applied' | 'shortlisted' | 'assigned' | 'withdrawn' | 'rejected';

@Entity('repair_request_applications')
@Index(['requestId', 'workerUserId'], { unique: true })
export class RequestApplicationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'request_id', type: 'int' })
  requestId: number;

  @Index()
  @Column({ name: 'worker_user_id', type: 'int' })
  workerUserId: number;

  @Column({
    type: 'enum',
    enum: ['applied', 'shortlisted', 'assigned', 'withdrawn', 'rejected'],
    default: 'applied',
  })
  status: RequestApplicationStatus;

  @Column({ name: 'offer_min', type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerMin: string | null;

  @Column({ name: 'offer_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerMax: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

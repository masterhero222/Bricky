import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RequestApplicationStatus = 'applied' | 'assigned' | 'withdrawn' | 'rejected';

@Entity('request_applications')
@Index(['requestId', 'workerUserId'], { unique: true })
export class RequestApplicationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  requestId: number;

  @Index()
  @Column({ type: 'int' })
  workerUserId: number;

  @Column({
    type: 'enum',
    enum: ['applied', 'assigned', 'withdrawn', 'rejected'],
    default: 'applied',
  })
  status: RequestApplicationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerMin: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerMax: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

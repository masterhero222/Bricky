import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('reviews')
@Index(['requestId', 'clientUserId'], { unique: true })
export class ReviewEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  requestId: number;

  @Column({ type: 'int' })
  workerUserId: number;

  @Column({ type: 'int' })
  clientUserId: number;

  @Column({ type: 'int' })
  rating: number; // 1..5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  created_at: Date;

    @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  completedByWorkerId: number | null;

}

// src/workers/worker.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('worker')
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  phone: string;

  @Column()
  city: string;

  @Column()
  skills: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ nullable: true })
  userId: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

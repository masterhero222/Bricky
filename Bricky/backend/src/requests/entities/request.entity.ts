import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (client) => client.requests, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'clientId' })
  client: UserEntity | null;

  @Column({ length: 100 })
  clientName: string;

  @Column({ length: 120 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255, nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: ['ВиК', 'Електро', 'Шпакловка и боя', 'Плочки'],
    nullable: true,
  })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['нова', 'кандидатствана', 'назначена', 'в процес', 'завършена', 'отказана'],
    default: 'нова',
  })
  status: string;

  @Column('simple-array', { nullable: true })
  appliedWorkers: number[];

  @Column({ type: 'int', nullable: true })
  assignedWorkerId: number | null;

  // ✅ NEW: completion info
  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  completedByWorkerId: number | null;

  @CreateDateColumn()
  created_at: Date;
}

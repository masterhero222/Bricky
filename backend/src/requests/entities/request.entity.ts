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
  category: 'ВиК' | 'Електро' | 'Шпакловка и боя' | 'Плочки';

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['нова', 'в процес', 'завършена', 'отказана'],
    default: 'нова',
  })
  status: 'нова' | 'в процес' | 'завършена' | 'отказана';

  @CreateDateColumn()
  created_at: Date;
}

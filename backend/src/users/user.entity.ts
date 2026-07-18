import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequestEntity } from '../requests/entities/request.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ default: 'client' })
  role: string;

  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => RequestEntity, (request) => request.client)
  requests: RequestEntity[];

  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;
}

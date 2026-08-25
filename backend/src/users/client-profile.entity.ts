import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('client_profiles')
export class ClientProfileEntity {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'display_name', length: 120 })
  displayName: string;

  @Column({ name: 'phone_private', type: 'varchar', length: 40, nullable: true })
  phonePrivate: string | null;

  @Column({ name: 'default_address', type: 'varchar', length: 255, nullable: true })
  defaultAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

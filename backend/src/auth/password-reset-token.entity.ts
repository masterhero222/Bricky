import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('password_reset_tokens')
@Index('idx_password_reset_user_active', ['userId', 'consumedAt', 'expiresAt'])
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'datetime', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

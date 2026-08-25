import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('worker_credit_wallets')
export class WorkerCreditWalletEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('uq_worker_credit_wallet', { unique: true })
  @Column({ name: 'worker_user_id', type: 'int' })
  workerUserId: number;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

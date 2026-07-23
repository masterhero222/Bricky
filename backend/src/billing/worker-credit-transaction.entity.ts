import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('worker_credit_transactions')
export class WorkerCreditTransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'worker_user_id', type: 'int' })
  workerUserId: number;

  @Column({ type: 'int' })
  amount: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number;

  @Column({ length: 80 })
  reason: string;

  @Column({ name: 'admin_user_id', type: 'int', nullable: true })
  adminUserId: number | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

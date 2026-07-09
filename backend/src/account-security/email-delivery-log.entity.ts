import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EmailDeliveryStatus = 'queued' | 'sent' | 'failed' | 'skipped';

@Entity('email_delivery_logs')
export class EmailDeliveryLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  type: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  provider: string | null;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'queued' })
  status: EmailDeliveryStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerMessageId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastAttemptAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

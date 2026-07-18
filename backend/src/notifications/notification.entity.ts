import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number; // users.id

  @Column({ type: 'varchar', length: 50, nullable: false })
  type: string; // request_assigned

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'payload_json', type: 'json', nullable: true })
  payloadJson: Record<string, any> | null;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

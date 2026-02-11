import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number; // users.id

  @Column({ type: 'varchar', length: 50, nullable: false })
  type: string; // request_assigned

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'int', nullable: true })
  requestId: number | null;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

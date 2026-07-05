import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_audit_logs')
export class AdminAuditLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  adminUserId: number;

  @Index()
  @Column({ type: 'varchar', length: 40 })
  entityType: string;

  @Index()
  @Column({ type: 'int' })
  entityId: number;

  @Column({ type: 'varchar', length: 40 })
  action: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}


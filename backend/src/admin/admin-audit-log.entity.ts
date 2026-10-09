import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_action_audit_logs')
export class AdminAuditLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'admin_user_id', type: 'int', nullable: true })
  adminUserId: number | null;

  @Index()
  @Column({ length: 80 })
  action: string;

  @Column({ name: 'target_type', type: 'varchar', length: 80, nullable: true })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'varchar', length: 80, nullable: true })
  targetId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

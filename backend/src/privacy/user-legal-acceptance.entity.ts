import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_legal_acceptances')
@Index(['userId', 'documentType', 'documentVersion'], { unique: true })
export class UserLegalAcceptanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'document_type', type: 'varchar', length: 20 })
  documentType: 'terms' | 'privacy';

  @Column({ name: 'document_version', type: 'varchar', length: 40 })
  documentVersion: string;

  @Column({ type: 'varchar', length: 30, default: 'registration' })
  source: string;

  @Column({ name: 'ip_hash', type: 'char', length: 64, nullable: true })
  ipHash: string | null;

  @Column({ name: 'user_agent_hash', type: 'char', length: 64, nullable: true })
  userAgentHash: string | null;

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;
}

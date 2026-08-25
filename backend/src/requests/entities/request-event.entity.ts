import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('repair_request_events')
export class RequestEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'request_id', type: 'int' })
  requestId: number;

  @Index()
  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @Index()
  @Column({ name: 'event_type', length: 80 })
  eventType: string;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

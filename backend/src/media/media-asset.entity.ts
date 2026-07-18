import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('media_assets')
export class MediaAssetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'owner_user_id', type: 'int' })
  ownerUserId: number;

  @Index()
  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @Index()
  @Column({ name: 'worker_user_id', type: 'int', nullable: true })
  workerUserId: number | null;

  @Index()
  @Column({ length: 60 })
  kind: string;

  @Column({ name: 'storage_provider', length: 40, default: 'vps' })
  storageProvider: string;

  @Column({ name: 'storage_key', length: 255 })
  storageKey: string;

  @Column({ name: 'public_url', length: 255 })
  publicUrl: string;

  @Column({ name: 'mime_type', length: 120, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'int', nullable: true })
  sizeBytes: number | null;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Index()
  @Column({ name: 'moderation_status', default: 'pending' })
  moderationStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

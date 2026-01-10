import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('worker_gallery_images')
export class WorkerGalleryImage {
  @PrimaryGeneratedColumn()
  id: number;

  // users.id
  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number;

  // /uploads/workers/gallery/....
  @Column({ type: 'varchar', length: 255, nullable: false })
  url: string;

  @CreateDateColumn()
  created_at: Date;
}

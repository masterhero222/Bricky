// src/workers/worker.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity()
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) this.email = this.email.trim().toLowerCase();
  }

  @Column({ length: 255 })
  password: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  city: string;

  @Column({ type: 'simple-array' })
  skills: string[];

  @Column({ default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

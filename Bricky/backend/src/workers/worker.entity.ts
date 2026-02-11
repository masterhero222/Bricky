import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('worker')
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  // връзка към users.id (важно за JWT "me")
  @Index({ unique: true })
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ nullable: true })
  fullName: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column('simple-array', { nullable: true })
  skills: string[];

  // NEW PROFILE FIELDS
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  experience: string;

  @Column({ type: 'text', nullable: true })
  equipment: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

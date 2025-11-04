import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  city: string;

  @Column({ type: 'simple-array' })
  skills: string[]; // ['ВиК', 'Електро', 'Зидар']

  @Column({ default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

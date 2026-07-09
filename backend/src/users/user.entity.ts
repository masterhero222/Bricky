import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RequestEntity } from '../requests/entities/request.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'client' })
  role: string;

  @Column({ type: 'varchar', length: 30, default: 'active' })
  accountStatus: 'active' | 'suspended';

  @Column({ type: 'datetime', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  emailVerificationRequired: boolean;

  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ type: 'datetime', nullable: true })
  passwordChangedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  newsOptIn: boolean;

  @Column({ type: 'datetime', nullable: true })
  newsOptInAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  newsOptInSource: string | null;

  @Column({ type: 'datetime', nullable: true })
  newsUnsubscribedAt: Date | null;

  @OneToMany(() => RequestEntity, (request) => request.client)
  requests: RequestEntity[];
}

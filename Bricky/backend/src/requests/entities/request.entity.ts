import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Request {
  @PrimaryGeneratedColumn()
  id: number;


@Column()
name: string;

@Column()
phone: string;

@Column()
address: string;

@Column()
serviceType: string; // шпакловка, баня, покрив и т.н.

@Column({ type: 'text', nullable: true })
notes?: string;


@Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date; // дата на заявката

}

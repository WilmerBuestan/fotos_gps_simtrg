// ============================================================
// ENTIDAD ORM: DronFisicoOrmEntity
// Capa: Infrastructure > Database
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EstadoDronFisico } from '../../../core/domain/entities/dron-fisico.entity';

@Entity('dron_fisico')
export class DronFisicoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'codigo_interno', unique: true })
  codigoInterno: string;

  @Column()
  modelo: string;

  @Column({ type: 'varchar', nullable: true })
  marca: string | null;

  @Index({ unique: true, where: '"tag_rfid" IS NOT NULL' })
  @Column({ name: 'tag_rfid', type: 'varchar', nullable: true })
  tagRfid: string | null;

  @Column({
    type: 'enum',
    enum: EstadoDronFisico,
    default: EstadoDronFisico.DISPONIBLE,
  })
  estado: EstadoDronFisico;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

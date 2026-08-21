// ============================================================
// ENTIDAD ORM: PrestamoDronOrmEntity
// Capa: Infrastructure > Database
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrigenPrestamoDron } from '../../../core/domain/entities/prestamo-dron.entity';
import { DronFisicoOrmEntity } from './dron-fisico.orm-entity';
import { UsuarioOrmEntity } from './usuario.orm-entity';

@Entity('prestamo_dron')
export class PrestamoDronOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'dron_id' })
  dronId: string;

  @ManyToOne(() => DronFisicoOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'dron_id' })
  dron: DronFisicoOrmEntity;

  @Column({ name: 'usuario_salida_id' })
  usuarioSalidaId: string;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_salida_id' })
  usuarioSalida: UsuarioOrmEntity;

  @Column({ name: 'fecha_salida', type: 'timestamptz' })
  fechaSalida: Date;

  @Column({ name: 'usuario_entrada_id', nullable: true })
  usuarioEntradaId: string | null;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'usuario_entrada_id' })
  usuarioEntrada: UsuarioOrmEntity | null;

  @Column({ name: 'fecha_entrada', type: 'timestamptz', nullable: true })
  fechaEntrada: Date | null;

  @Column({
    type: 'enum',
    enum: OrigenPrestamoDron,
    default: OrigenPrestamoDron.ESP32,
  })
  origen: OrigenPrestamoDron;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

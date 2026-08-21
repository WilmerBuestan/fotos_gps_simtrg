// ============================================================
// ENTIDAD ORM: MovimientoPendienteOrmEntity
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
import { TipoMovimientoPendiente } from '../../../core/domain/entities/movimiento-pendiente.entity';
import { DronFisicoOrmEntity } from './dron-fisico.orm-entity';
import { UsuarioOrmEntity } from './usuario.orm-entity';
import { PrestamoDronOrmEntity } from './prestamo-dron.orm-entity';

@Entity('movimiento_pendiente')
export class MovimientoPendienteOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoMovimientoPendiente,
  })
  tipo: TipoMovimientoPendiente;

  @Column({ name: 'dron_id', nullable: true })
  dronId: string | null;

  @ManyToOne(() => DronFisicoOrmEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'dron_id' })
  dron: DronFisicoOrmEntity | null;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UsuarioOrmEntity | null;

  @Column({ name: 'tag_conocido' })
  tagConocido: string;

  @Index()
  @Column({ default: false })
  resuelto: boolean;

  @Column({ name: 'resuelto_por_id', nullable: true })
  resueltoPorId: string | null;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'resuelto_por_id' })
  resueltoPor: UsuarioOrmEntity | null;

  @Column({ name: 'prestamo_id', nullable: true })
  prestamoId: string | null;

  @ManyToOne(() => PrestamoDronOrmEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'prestamo_id' })
  prestamo: PrestamoDronOrmEntity | null;

  @Column({ name: 'fecha_resolucion', type: 'timestamptz', nullable: true })
  fechaResolucion: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

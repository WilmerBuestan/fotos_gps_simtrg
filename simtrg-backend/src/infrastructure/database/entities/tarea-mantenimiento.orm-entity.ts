// ============================================================
// ENTIDAD ORM: TareaMantenimientoOrmEntity
// Capa: Infrastructure > Database
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PrioridadTarea, EstadoTarea } from '../../../core/domain/entities/tarea-mantenimiento.entity';
import { DronFisicoOrmEntity } from './dron-fisico.orm-entity';
import { UsuarioOrmEntity } from './usuario.orm-entity';

@Entity('tarea_mantenimiento')
export class TareaMantenimientoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dron_id' })
  dronId: string;

  @ManyToOne(() => DronFisicoOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'dron_id' })
  dron: DronFisicoOrmEntity;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: PrioridadTarea, default: PrioridadTarea.MEDIA })
  prioridad: PrioridadTarea;

  @Column({ name: 'tecnico_asignado', type: 'varchar', nullable: true })
  tecnicoAsignado: string | null;

  @Index()
  @Column({ type: 'enum', enum: EstadoTarea, default: EstadoTarea.PENDIENTE })
  estado: EstadoTarea;

  @Column({ name: 'creado_por_id' })
  creadoPorId: string;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor: UsuarioOrmEntity;

  @Column({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_completada', type: 'timestamptz', nullable: true })
  fechaCompletada: Date | null;
}

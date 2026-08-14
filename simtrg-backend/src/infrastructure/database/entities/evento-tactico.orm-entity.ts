import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UsuarioOrmEntity } from './usuario.orm-entity';
import { TipoActividadOrmEntity } from './tipo-actividad.orm-entity';

@Entity('eventos_tacticos')
export class EventoTacticoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora: Date;

  @Column({ type: 'double precision' })
  latitud: number;

  @Column({ type: 'double precision' })
  longitud: number;

  @Column({ name: 'tipo_actividad_id' })
  tipoActividadId: string;

  @ManyToOne(() => TipoActividadOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tipo_actividad_id' })
  tipoActividad: TipoActividadOrmEntity;

  @Column({ name: 'descripcion_detallada', type: 'text' })
  descripcionDetallada: string;

  @Column({ type: 'varchar', nullable: true })
  provincia: string | null;

  @Column({ type: 'varchar', nullable: true })
  canton: string | null;

  @Column({ name: 'operador_id' })
  operadorId: string;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'operador_id' })
  operador: UsuarioOrmEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

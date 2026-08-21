// ============================================================
// ENTIDAD ORM: AuditoriaLogOrmEntity
// Capa: Infrastructure > Database
// ============================================================

import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { TipoEventoAuditoria } from '../../../core/domain/entities/auditoria-log.entity';

@Entity('auditoria_logs')
export class AuditoriaLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'now()' })
  timestamp: Date;

  @Index()
  @Column({
    name: 'tipo_evento',
    type: 'enum',
    enum: TipoEventoAuditoria,
  })
  tipoEvento: TipoEventoAuditoria;

  @Column({ name: 'metodo_http', length: 10 })
  metodoHttp: string;

  @Column({ length: 500 })
  url: string;

  @Index()
  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  rol: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitud: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitud: number | null;

  @Column({ type: 'varchar', nullable: true })
  provincia: string | null;

  @Column({ type: 'varchar', nullable: true })
  canton: string | null;

  @Column({ type: 'varchar', nullable: true })
  parroquia: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @Column({ default: true })
  exitoso: boolean;

  @Column({ name: 'mensaje_error', type: 'text', nullable: true })
  mensajeError: string | null;
}

// ============================================================
// ENTIDAD ORM: UsuarioOrmEntity
// Capa: Infrastructure > Database
// Mapea la entidad de dominio a la tabla de PostgreSQL.
// Tiene decoradores de TypeORM — por eso está en infraestructura.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { RolUsuario } from '../../../core/domain/entities/usuario.entity';

@Entity('usuarios')
export class UsuarioOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: RolUsuario,
    default: RolUsuario.OPERADOR,
  })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'ultimo_acceso', nullable: true, type: 'timestamptz' })
  ultimoAcceso: Date | null;

  @Column({ name: 'ultima_ubicacion_lat', type: 'double precision', nullable: true })
  ultimaUbicacionLat: number | null;

  @Column({ name: 'ultima_ubicacion_lon', type: 'double precision', nullable: true })
  ultimaUbicacionLon: number | null;

  @Column({ name: 'ultima_ubicacion_provincia', type: 'varchar', nullable: true })
  ultimaUbicacionProvincia: string | null;

  @Column({ name: 'ultima_ubicacion_canton', type: 'varchar', nullable: true })
  ultimaUbicacionCanton: string | null;

  @Column({ name: 'ultima_ubicacion_parroquia', type: 'varchar', nullable: true })
  ultimaUbicacionParroquia: string | null;

  @Column({ name: 'ultima_ubicacion_fecha', type: 'timestamptz', nullable: true })
  ultimaUbicacionFecha: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

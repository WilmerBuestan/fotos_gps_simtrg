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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

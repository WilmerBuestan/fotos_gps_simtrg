// ============================================================
// PUERTO (Interfaz de Repositorio): IUsuarioRepository
// Capa: Core > Domain
// Define el contrato que la infraestructura DEBE implementar.
// El dominio nunca sabe cómo se persisten los datos.
// ============================================================

import { UsuarioDomain, RolUsuario } from '../entities/usuario.entity';

export interface CreateUsuarioDto {
  nombre: string;
  apellido: string;
  username: string;
  passwordHash: string;
  rol: RolUsuario;
  tagRfid?: string | null;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  apellido?: string;
  passwordHash?: string;
  rol?: RolUsuario;
  activo?: boolean;
  ultimoAcceso?: Date;
  ultimaUbicacionLat?: number;
  ultimaUbicacionLon?: number;
  ultimaUbicacionProvincia?: string;
  ultimaUbicacionCanton?: string;
  ultimaUbicacionParroquia?: string;
  ultimaUbicacionFecha?: Date;
  tagRfid?: string | null;
}

export abstract class IUsuarioRepository {
  abstract findById(id: string): Promise<UsuarioDomain | null>;
  abstract findByUsername(username: string): Promise<UsuarioDomain | null>;
  abstract findByTagRfid(tagRfid: string): Promise<UsuarioDomain | null>;
  abstract findAll(): Promise<UsuarioDomain[]>;
  abstract create(data: CreateUsuarioDto): Promise<UsuarioDomain>;
  abstract update(id: string, data: UpdateUsuarioDto): Promise<UsuarioDomain>;
  abstract delete(id: string): Promise<void>;
  abstract existsByUsername(username: string): Promise<boolean>;
}

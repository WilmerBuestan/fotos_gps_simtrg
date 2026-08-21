// ============================================================
// ADAPTADOR (Implementación del Puerto): UsuarioRepositoryImpl
// Capa: Infrastructure > Database
// Implementa IUsuarioRepository usando TypeORM + PostgreSQL.
// El dominio nunca importa este archivo.
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IUsuarioRepository,
  CreateUsuarioDto,
  UpdateUsuarioDto,
} from '../../../core/domain/repositories/usuario.repository';
import {
  UsuarioDomain,
  RolUsuario,
} from '../../../core/domain/entities/usuario.entity';
import { UsuarioOrmEntity } from '../entities/usuario.orm-entity';

@Injectable()
export class UsuarioRepositoryImpl implements IUsuarioRepository {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repo: Repository<UsuarioOrmEntity>,
  ) {}

  // ---- Mappers ----

  private toDomain(orm: UsuarioOrmEntity): UsuarioDomain {
    return new UsuarioDomain(
      orm.id,
      orm.nombre,
      orm.apellido,
      orm.username,
      orm.passwordHash,
      orm.rol,
      orm.activo,
      orm.createdAt,
      orm.updatedAt,
      orm.ultimoAcceso ?? undefined,
      orm.ultimaUbicacionLat ?? undefined,
      orm.ultimaUbicacionLon ?? undefined,
      orm.ultimaUbicacionProvincia ?? undefined,
      orm.ultimaUbicacionCanton ?? undefined,
      orm.ultimaUbicacionParroquia ?? undefined,
      orm.ultimaUbicacionFecha ?? undefined,
    );
  }

  // ---- Implementaciones ----

  async findById(id: string): Promise<UsuarioDomain | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? this.toDomain(orm) : null;
  }

  async findByUsername(username: string): Promise<UsuarioDomain | null> {
    const orm = await this.repo.findOne({ where: { username } });
    return orm ? this.toDomain(orm) : null;
  }

  async findAll(): Promise<UsuarioDomain[]> {
    const orms = await this.repo.find({
      order: { createdAt: 'DESC' },
    });
    return orms.map((o) => this.toDomain(o));
  }

  async create(data: CreateUsuarioDto): Promise<UsuarioDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      nombre: data.nombre,
      apellido: data.apellido,
      username: data.username,
      passwordHash: data.passwordHash,
      rol: data.rol,
      activo: true,
    });
    const saved = await this.repo.save(orm);
    return this.toDomain(saved);
  }

  async update(id: string, data: UpdateUsuarioDto): Promise<UsuarioDomain> {
    await this.repo.update(id, {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.apellido && { apellido: data.apellido }),
      ...(data.passwordHash && { passwordHash: data.passwordHash }),
      ...(data.rol && { rol: data.rol }),
      ...(data.activo !== undefined && { activo: data.activo }),
      ...(data.ultimoAcceso && { ultimoAcceso: data.ultimoAcceso }),
      ...(data.ultimaUbicacionLat !== undefined && {
        ultimaUbicacionLat: data.ultimaUbicacionLat,
      }),
      ...(data.ultimaUbicacionLon !== undefined && {
        ultimaUbicacionLon: data.ultimaUbicacionLon,
      }),
      ...(data.ultimaUbicacionProvincia !== undefined && {
        ultimaUbicacionProvincia: data.ultimaUbicacionProvincia,
      }),
      ...(data.ultimaUbicacionCanton !== undefined && {
        ultimaUbicacionCanton: data.ultimaUbicacionCanton,
      }),
      ...(data.ultimaUbicacionParroquia !== undefined && {
        ultimaUbicacionParroquia: data.ultimaUbicacionParroquia,
      }),
      ...(data.ultimaUbicacionFecha && { ultimaUbicacionFecha: data.ultimaUbicacionFecha }),
    });
    const updated = await this.repo.findOne({ where: { id } });
    return this.toDomain(updated!);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.repo.count({ where: { username } });
    return count > 0;
  }
}

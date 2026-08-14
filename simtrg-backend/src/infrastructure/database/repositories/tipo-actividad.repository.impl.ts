import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  ITipoActividadRepository,
  CreateTipoActividadDto,
} from '../../../core/domain/repositories/eventos.repository';
import { TipoActividadDomain } from '../../../core/domain/entities/tipo-actividad.entity';
import { TipoActividadOrmEntity } from '../entities/tipo-actividad.orm-entity';

@Injectable()
export class TipoActividadRepositoryImpl implements ITipoActividadRepository {
  constructor(
    @InjectRepository(TipoActividadOrmEntity)
    private readonly repo: Repository<TipoActividadOrmEntity>,
  ) {}

  private toDomain(orm: TipoActividadOrmEntity): TipoActividadDomain {
    return new TipoActividadDomain(
      orm.id,
      orm.nombre,
      orm.descripcion,
      orm.activo,
      orm.createdAt,
      orm.updatedAt,
    );
  }

  async findAll(soloActivos = false): Promise<TipoActividadDomain[]> {
    const where = soloActivos ? { activo: true } : {};
    const orms = await this.repo.find({ where, order: { nombre: 'ASC' } });
    return orms.map((o) => this.toDomain(o));
  }

  async findById(id: string): Promise<TipoActividadDomain | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? this.toDomain(orm) : null;
  }

  async findByNombre(nombre: string): Promise<TipoActividadDomain | null> {
    const orm = await this.repo.findOne({ where: { nombre } });
    return orm ? this.toDomain(orm) : null;
  }

  async create(data: CreateTipoActividadDto): Promise<TipoActividadDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: true,
    });
    const saved = await this.repo.save(orm);
    return this.toDomain(saved);
  }

  async update(
    id: string,
    data: Partial<CreateTipoActividadDto & { activo: boolean }>,
  ): Promise<TipoActividadDomain> {
    await this.repo.update(id, {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.activo !== undefined && { activo: data.activo }),
    });
    const updated = await this.repo.findOne({ where: { id } });
    return this.toDomain(updated!);
  }
}

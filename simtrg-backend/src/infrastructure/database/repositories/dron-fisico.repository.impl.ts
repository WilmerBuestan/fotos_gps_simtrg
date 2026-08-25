// ============================================================
// ADAPTADOR: DronFisicoRepositoryImpl
// Capa: Infrastructure > Database
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IDronFisicoRepository,
  CreateDronFisicoDto,
  UpdateDronFisicoDto,
} from '../../../core/domain/repositories/dron-fisico.repository';
import { DronFisicoDomain } from '../../../core/domain/entities/dron-fisico.entity';
import { DronFisicoOrmEntity } from '../entities/dron-fisico.orm-entity';

@Injectable()
export class DronFisicoRepositoryImpl implements IDronFisicoRepository {
  constructor(
    @InjectRepository(DronFisicoOrmEntity)
    private readonly repo: Repository<DronFisicoOrmEntity>,
  ) {}

  private toDomain(orm: DronFisicoOrmEntity): DronFisicoDomain {
    return new DronFisicoDomain(
      orm.id,
      orm.codigoInterno,
      orm.modelo,
      orm.marca,
      orm.tagRfid,
      orm.estado,
      orm.observaciones,
      orm.activo,
      orm.createdAt,
      orm.updatedAt,
      orm.foto,
      orm.version,
      orm.anioCompra,
      Number(orm.horasVuelo),
      orm.bateriaPorcentaje,
      orm.bateriaActualizada,
      orm.ubicacionBodega,
    );
  }

  async create(data: CreateDronFisicoDto): Promise<DronFisicoDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      codigoInterno: data.codigoInterno,
      modelo: data.modelo,
      marca: data.marca ?? null,
      version: data.version ?? null,
      tagRfid: data.tagRfid ?? null,
      observaciones: data.observaciones ?? null,
      anioCompra: data.anioCompra ?? null,
    });
    const saved = await this.repo.save(orm);
    return this.toDomain(saved);
  }

  async findAll(): Promise<DronFisicoDomain[]> {
    const orms = await this.repo.find({ order: { codigoInterno: 'ASC' } });
    return orms.map((o) => this.toDomain(o));
  }

  async findById(id: string): Promise<DronFisicoDomain | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? this.toDomain(orm) : null;
  }

  async findByTagRfid(tagRfid: string): Promise<DronFisicoDomain | null> {
    const orm = await this.repo.findOne({ where: { tagRfid } });
    return orm ? this.toDomain(orm) : null;
  }

  async findByCodigoInterno(codigoInterno: string): Promise<DronFisicoDomain | null> {
    const orm = await this.repo.findOne({ where: { codigoInterno } });
    return orm ? this.toDomain(orm) : null;
  }

  async update(id: string, data: UpdateDronFisicoDto): Promise<DronFisicoDomain> {
    await this.repo.update(id, {
      ...(data.codigoInterno !== undefined && { codigoInterno: data.codigoInterno }),
      ...(data.modelo !== undefined && { modelo: data.modelo }),
      ...(data.marca !== undefined && { marca: data.marca }),
      ...(data.version !== undefined && { version: data.version }),
      ...(data.tagRfid !== undefined && { tagRfid: data.tagRfid }),
      ...(data.estado !== undefined && { estado: data.estado }),
      ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      ...(data.activo !== undefined && { activo: data.activo }),
      ...(data.foto !== undefined && { foto: data.foto }),
      ...(data.anioCompra !== undefined && { anioCompra: data.anioCompra }),
      ...(data.horasVuelo !== undefined && { horasVuelo: data.horasVuelo }),
      ...(data.bateriaPorcentaje !== undefined && { bateriaPorcentaje: data.bateriaPorcentaje }),
      ...(data.bateriaActualizada !== undefined && { bateriaActualizada: data.bateriaActualizada }),
      ...(data.ubicacionBodega !== undefined && { ubicacionBodega: data.ubicacionBodega }),
    });
    const updated = await this.repo.findOne({ where: { id } });
    return this.toDomain(updated!);
  }
}

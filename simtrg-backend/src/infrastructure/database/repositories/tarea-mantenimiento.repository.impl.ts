// ============================================================
// ADAPTADOR: TareaMantenimientoRepositoryImpl
// Capa: Infrastructure > Database
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  ITareaMantenimientoRepository,
  CreateTareaMantenimientoDto,
  FiltroTareasMantenimientoDto,
} from '../../../core/domain/repositories/tarea-mantenimiento.repository';
import {
  TareaMantenimientoDomain,
  EstadoTarea,
} from '../../../core/domain/entities/tarea-mantenimiento.entity';
import { TareaMantenimientoOrmEntity } from '../entities/tarea-mantenimiento.orm-entity';

@Injectable()
export class TareaMantenimientoRepositoryImpl implements ITareaMantenimientoRepository {
  constructor(
    @InjectRepository(TareaMantenimientoOrmEntity)
    private readonly repo: Repository<TareaMantenimientoOrmEntity>,
  ) {}

  private toDomain(orm: TareaMantenimientoOrmEntity): TareaMantenimientoDomain {
    return new TareaMantenimientoDomain(
      orm.id,
      orm.dronId,
      orm.descripcion,
      orm.prioridad,
      orm.tecnicoAsignado,
      orm.estado,
      orm.creadoPorId,
      orm.fechaCreacion,
      orm.fechaCompletada,
      orm.dron?.codigoInterno,
    );
  }

  async create(data: CreateTareaMantenimientoDto): Promise<TareaMantenimientoDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      dronId: data.dronId,
      descripcion: data.descripcion,
      prioridad: data.prioridad,
      tecnicoAsignado: data.tecnicoAsignado ?? null,
      creadoPorId: data.creadoPorId,
      fechaCreacion: new Date(),
    });
    const saved = await this.repo.save(orm);
    const withRelations = await this.repo.findOne({ where: { id: saved.id }, relations: ['dron'] });
    return this.toDomain(withRelations!);
  }

  async findById(id: string): Promise<TareaMantenimientoDomain | null> {
    const orm = await this.repo.findOne({ where: { id }, relations: ['dron'] });
    return orm ? this.toDomain(orm) : null;
  }

  async findAll(filtro?: FiltroTareasMantenimientoDto): Promise<TareaMantenimientoDomain[]> {
    const qb = this.repo
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.dron', 'dron')
      .orderBy('tarea.fechaCreacion', 'DESC');

    if (filtro?.dronId) {
      qb.andWhere('tarea.dronId = :dronId', { dronId: filtro.dronId });
    }
    if (filtro?.soloPendientes) {
      qb.andWhere('tarea.estado = :estado', { estado: EstadoTarea.PENDIENTE });
    }

    const orms = await qb.getMany();
    return orms.map((o) => this.toDomain(o));
  }

  async completar(id: string): Promise<TareaMantenimientoDomain> {
    await this.repo.update(id, { estado: EstadoTarea.COMPLETADA, fechaCompletada: new Date() });
    const updated = await this.repo.findOne({ where: { id }, relations: ['dron'] });
    return this.toDomain(updated!);
  }
}

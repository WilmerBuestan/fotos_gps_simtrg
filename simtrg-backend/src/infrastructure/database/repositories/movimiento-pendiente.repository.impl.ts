// ============================================================
// ADAPTADOR: MovimientoPendienteRepositoryImpl
// Capa: Infrastructure > Database
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IMovimientoPendienteRepository,
  CreateMovimientoPendienteDto,
} from '../../../core/domain/repositories/movimiento-pendiente.repository';
import { MovimientoPendienteDomain } from '../../../core/domain/entities/movimiento-pendiente.entity';
import { MovimientoPendienteOrmEntity } from '../entities/movimiento-pendiente.orm-entity';

@Injectable()
export class MovimientoPendienteRepositoryImpl implements IMovimientoPendienteRepository {
  constructor(
    @InjectRepository(MovimientoPendienteOrmEntity)
    private readonly repo: Repository<MovimientoPendienteOrmEntity>,
  ) {}

  private toDomain(orm: MovimientoPendienteOrmEntity): MovimientoPendienteDomain {
    return new MovimientoPendienteDomain(
      orm.id,
      orm.tipo,
      orm.dronId,
      orm.usuarioId,
      orm.tagConocido,
      orm.resuelto,
      orm.resueltoPorId,
      orm.prestamoId,
      orm.fechaResolucion,
      orm.createdAt,
      orm.dron?.codigoInterno,
      orm.usuario ? `${orm.usuario.nombre} ${orm.usuario.apellido}` : undefined,
    );
  }

  async create(data: CreateMovimientoPendienteDto): Promise<MovimientoPendienteDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      tipo: data.tipo,
      dronId: data.dronId ?? null,
      usuarioId: data.usuarioId ?? null,
      tagConocido: data.tagConocido,
    });
    const saved = await this.repo.save(orm);
    const withRelations = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['dron', 'usuario'],
    });
    return this.toDomain(withRelations!);
  }

  async findById(id: string): Promise<MovimientoPendienteDomain | null> {
    const orm = await this.repo.findOne({ where: { id }, relations: ['dron', 'usuario'] });
    return orm ? this.toDomain(orm) : null;
  }

  async findPendientes(): Promise<MovimientoPendienteDomain[]> {
    const orms = await this.repo.find({
      where: { resuelto: false },
      relations: ['dron', 'usuario'],
      order: { createdAt: 'DESC' },
    });
    return orms.map((o) => this.toDomain(o));
  }

  async marcarResuelto(
    id: string,
    resueltoPorId: string,
    prestamoId: string | null,
  ): Promise<MovimientoPendienteDomain> {
    const existente = await this.repo.findOne({ where: { id } });
    if (!existente) {
      throw new NotFoundException('Movimiento pendiente no encontrado.');
    }
    await this.repo.update(id, {
      resuelto: true,
      resueltoPorId,
      prestamoId,
      fechaResolucion: new Date(),
    });
    const updated = await this.repo.findOne({
      where: { id },
      relations: ['dron', 'usuario'],
    });
    return this.toDomain(updated!);
  }
}

// ============================================================
// ADAPTADOR: PrestamoDronRepositoryImpl
// Capa: Infrastructure > Database
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IPrestamoDronRepository,
  CreatePrestamoDronDto,
  FiltroPrestamosDto,
} from '../../../core/domain/repositories/prestamo-dron.repository';
import { PrestamoDronDomain } from '../../../core/domain/entities/prestamo-dron.entity';
import { formatearNombreCompleto } from '../../../core/domain/entities/usuario.entity';
import { PrestamoDronOrmEntity } from '../entities/prestamo-dron.orm-entity';

@Injectable()
export class PrestamoDronRepositoryImpl implements IPrestamoDronRepository {
  constructor(
    @InjectRepository(PrestamoDronOrmEntity)
    private readonly repo: Repository<PrestamoDronOrmEntity>,
  ) {}

  private toDomain(orm: PrestamoDronOrmEntity): PrestamoDronDomain {
    return new PrestamoDronDomain(
      orm.id,
      orm.dronId,
      orm.usuarioSalidaId,
      orm.fechaSalida,
      orm.usuarioEntradaId,
      orm.fechaEntrada,
      orm.origen,
      orm.observaciones,
      orm.createdAt,
      orm.dron?.codigoInterno,
      orm.usuarioSalida ? formatearNombreCompleto(orm.usuarioSalida.grado, orm.usuarioSalida.apellido, orm.usuarioSalida.nombre) : undefined,
      orm.usuarioEntrada ? formatearNombreCompleto(orm.usuarioEntrada.grado, orm.usuarioEntrada.apellido, orm.usuarioEntrada.nombre) : undefined,
    );
  }

  async create(data: CreatePrestamoDronDto): Promise<PrestamoDronDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      dronId: data.dronId,
      usuarioSalidaId: data.usuarioSalidaId,
      fechaSalida: new Date(),
      origen: data.origen,
      observaciones: data.observaciones ?? null,
    });
    const saved = await this.repo.save(orm);
    const withRelations = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['dron', 'usuarioSalida'],
    });
    return this.toDomain(withRelations!);
  }

  async findById(id: string): Promise<PrestamoDronDomain | null> {
    const orm = await this.repo.findOne({
      where: { id },
      relations: ['dron', 'usuarioSalida', 'usuarioEntrada'],
    });
    return orm ? this.toDomain(orm) : null;
  }

  async findPrestamoEnCurso(dronId: string): Promise<PrestamoDronDomain | null> {
    const orm = await this.repo.findOne({
      where: { dronId, fechaEntrada: IsNull() },
      relations: ['dron', 'usuarioSalida'],
      order: { fechaSalida: 'DESC' },
    });
    return orm ? this.toDomain(orm) : null;
  }

  async registrarEntrada(
    id: string,
    usuarioEntradaId: string,
    observaciones?: string | null,
  ): Promise<PrestamoDronDomain> {
    await this.repo.update(id, {
      usuarioEntradaId,
      fechaEntrada: new Date(),
      ...(observaciones !== undefined && { observaciones }),
    });
    const updated = await this.repo.findOne({
      where: { id },
      relations: ['dron', 'usuarioSalida', 'usuarioEntrada'],
    });
    return this.toDomain(updated!);
  }

  async findAll(filtro?: FiltroPrestamosDto): Promise<PrestamoDronDomain[]> {
    const qb = this.repo
      .createQueryBuilder('prestamo')
      .leftJoinAndSelect('prestamo.dron', 'dron')
      .leftJoinAndSelect('prestamo.usuarioSalida', 'usuarioSalida')
      .leftJoinAndSelect('prestamo.usuarioEntrada', 'usuarioEntrada')
      .orderBy('prestamo.fechaSalida', 'DESC');

    if (filtro?.dronId) {
      qb.andWhere('prestamo.dronId = :dronId', { dronId: filtro.dronId });
    }
    if (filtro?.usuarioId) {
      qb.andWhere(
        '(prestamo.usuarioSalidaId = :usuarioId OR prestamo.usuarioEntradaId = :usuarioId)',
        { usuarioId: filtro.usuarioId },
      );
    }
    if (filtro?.desde) {
      qb.andWhere('prestamo.fechaSalida >= :desde', { desde: filtro.desde });
    }
    if (filtro?.hasta) {
      qb.andWhere('prestamo.fechaSalida <= :hasta', { hasta: filtro.hasta });
    }
    if (filtro?.soloEnCurso) {
      qb.andWhere('prestamo.fechaEntrada IS NULL');
    }

    const orms = await qb.getMany();
    return orms.map((o) => this.toDomain(o));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

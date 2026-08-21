// ============================================================
// ADAPTADOR (Implementación del Puerto): AuditoriaLogRepositoryImpl
// Capa: Infrastructure > Database
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IAuditoriaLogRepository,
  CrearAuditoriaLogDto,
  FiltroLogsDto,
  LogsPaginados,
} from '../../../core/domain/repositories/auditoria-log.repository';
import { AuditoriaLogDomain } from '../../../core/domain/entities/auditoria-log.entity';
import { AuditoriaLogOrmEntity } from '../entities/auditoria-log.orm-entity';

@Injectable()
export class AuditoriaLogRepositoryImpl implements IAuditoriaLogRepository {
  constructor(
    @InjectRepository(AuditoriaLogOrmEntity)
    private readonly repo: Repository<AuditoriaLogOrmEntity>,
  ) {}

  private toDomain(orm: AuditoriaLogOrmEntity): AuditoriaLogDomain {
    return new AuditoriaLogDomain(
      orm.id,
      orm.timestamp,
      orm.tipoEvento,
      orm.metodoHttp,
      orm.url,
      orm.usuarioId,
      orm.username,
      orm.rol,
      orm.ip,
      orm.latitud,
      orm.longitud,
      orm.provincia,
      orm.canton,
      orm.parroquia,
      orm.detalle,
      orm.exitoso,
      orm.mensajeError,
    );
  }

  async crear(data: CrearAuditoriaLogDto): Promise<void> {
    const orm = this.repo.create({
      tipoEvento: data.tipoEvento,
      metodoHttp: data.metodoHttp,
      url: data.url,
      usuarioId: data.usuarioId ?? null,
      username: data.username ?? null,
      rol: data.rol ?? null,
      ip: data.ip ?? null,
      latitud: data.latitud ?? null,
      longitud: data.longitud ?? null,
      provincia: data.provincia ?? null,
      canton: data.canton ?? null,
      parroquia: data.parroquia ?? null,
      detalle: data.detalle ?? null,
      exitoso: data.exitoso,
      mensajeError: data.mensajeError ?? null,
    });
    await this.repo.save(orm);
  }

  async findAllPaginado(filtro: FiltroLogsDto): Promise<LogsPaginados> {
    const qb = this.repo.createQueryBuilder('log').orderBy('log.timestamp', 'DESC');

    if (filtro.tipoEvento) {
      qb.andWhere('log.tipoEvento = :tipoEvento', { tipoEvento: filtro.tipoEvento });
    }
    if (filtro.fechaDesde) {
      qb.andWhere('log.timestamp >= :fechaDesde', { fechaDesde: filtro.fechaDesde });
    }
    if (filtro.fechaHasta) {
      qb.andWhere('log.timestamp <= :fechaHasta', { fechaHasta: filtro.fechaHasta });
    }

    const [orms, total] = await qb
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return {
      data: orms.map((o) => this.toDomain(o)),
      total,
      page: filtro.page,
      limit: filtro.limit,
    };
  }
}

// ============================================================
// ADAPTADOR: EventoTacticoRepositoryImpl
// El heatmap usa ST_SnapToGrid de PostGIS para agrupar puntos
// cercanos y calcular la densidad de eventos por celda.
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IEventoTacticoRepository,
  CreateEventoTacticoDto,
  FiltroEventosDto,
  PuntoHeatmap,
} from '../../../core/domain/repositories/eventos.repository';
import { EventoTacticoDomain } from '../../../core/domain/entities/evento-tactico.entity';
import { EventoTacticoOrmEntity } from '../entities/evento-tactico.orm-entity';

// Tamaño de celda del grid para heatmap (en grados decimales)
// 0.01 ≈ 1.1km — ajustar según el área de operación
const GRID_SIZE = 0.01;

@Injectable()
export class EventoTacticoRepositoryImpl implements IEventoTacticoRepository {
  constructor(
    @InjectRepository(EventoTacticoOrmEntity)
    private readonly repo: Repository<EventoTacticoOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private toDomain(orm: EventoTacticoOrmEntity): EventoTacticoDomain {
    return new EventoTacticoDomain(
      orm.id,
      orm.fechaHora,
      orm.latitud,
      orm.longitud,
      orm.tipoActividadId,
      orm.descripcionDetallada,
      orm.operadorId,
      orm.createdAt,
      orm.updatedAt,
      orm.tipoActividad?.nombre,
      orm.operador ? `${orm.operador.nombre} ${orm.operador.apellido}` : undefined,
      undefined,
      orm.provincia,
      orm.canton,
    );
  }

  async create(data: CreateEventoTacticoDto): Promise<EventoTacticoDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      fechaHora: data.fechaHora,
      latitud: data.latitud,
      longitud: data.longitud,
      tipoActividadId: data.tipoActividadId,
      descripcionDetallada: data.descripcionDetallada,
      operadorId: data.operadorId,
      provincia: data.provincia ?? null,
      canton: data.canton ?? null,
    });
    const saved = await this.repo.save(orm);
    const withRelations = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['tipoActividad', 'operador'],
    });
    return this.toDomain(withRelations!);
  }

  async findAll(filtro?: FiltroEventosDto): Promise<EventoTacticoDomain[]> {
    const qb = this.repo
      .createQueryBuilder('evento')
      .leftJoinAndSelect('evento.tipoActividad', 'tipo')
      .leftJoinAndSelect('evento.operador', 'operador')
      .orderBy('evento.fechaHora', 'DESC');

    if (filtro?.desde) {
      qb.andWhere('evento.fechaHora >= :desde', { desde: filtro.desde });
    }
    if (filtro?.hasta) {
      qb.andWhere('evento.fechaHora <= :hasta', { hasta: filtro.hasta });
    }
    if (filtro?.tipoActividadId) {
      qb.andWhere('evento.tipoActividadId = :tipo', {
        tipo: filtro.tipoActividadId,
      });
    }
    if (filtro?.operadorId) {
      qb.andWhere('evento.operadorId = :operador', {
        operador: filtro.operadorId,
      });
    }

    const orms = await qb.getMany();
    return orms.map((o) => this.toDomain(o));
  }

  async findById(id: string): Promise<EventoTacticoDomain | null> {
    const orm = await this.repo.findOne({
      where: { id },
      relations: ['tipoActividad', 'operador'],
    });
    return orm ? this.toDomain(orm) : null;
  }

  async findByOperador(operadorId: string): Promise<EventoTacticoDomain[]> {
    const orms = await this.repo.find({
      where: { operadorId },
      relations: ['tipoActividad'],
      order: { fechaHora: 'DESC' },
    });
    return orms.map((o) => this.toDomain(o));
  }

  async update(
    id: string,
    data: Partial<Omit<CreateEventoTacticoDto, 'operadorId'>>,
  ): Promise<EventoTacticoDomain> {
    await this.repo.update(id, data);
    const actualizado = await this.repo.findOne({
      where: { id },
      relations: ['tipoActividad', 'operador'],
    });
    return this.toDomain(actualizado!);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // ---- Heatmap con ST_SnapToGrid (PostGIS) ----
  async generarHeatmap(filtro?: FiltroEventosDto): Promise<PuntoHeatmap[]> {
    let query = `
      SELECT
        ST_Y(ST_SnapToGrid(
          ST_SetSRID(ST_MakePoint(longitud, latitud), 4326),
          $1
        )) AS latitud,
        ST_X(ST_SnapToGrid(
          ST_SetSRID(ST_MakePoint(longitud, latitud), 4326),
          $1
        )) AS longitud,
        COUNT(*) AS peso,
        ta.nombre AS tipo_actividad
      FROM eventos_tacticos et
      JOIN tipos_actividad ta ON ta.id = et.tipo_actividad_id
      WHERE 1=1
    `;

    const params: any[] = [GRID_SIZE];
    let paramIdx = 2;

    if (filtro?.desde) {
      query += ` AND et.fecha_hora >= $${paramIdx++}`;
      params.push(filtro.desde);
    }
    if (filtro?.hasta) {
      query += ` AND et.fecha_hora <= $${paramIdx++}`;
      params.push(filtro.hasta);
    }
    if (filtro?.tipoActividadId) {
      query += ` AND et.tipo_actividad_id = $${paramIdx++}`;
      params.push(filtro.tipoActividadId);
    }
    if (filtro?.provincia) {
      query += ` AND et.provincia = $${paramIdx++}`;
      params.push(filtro.provincia);
    }

    query += `
      GROUP BY 1, 2, ta.nombre
      ORDER BY peso DESC
    `;

    const rows = await this.dataSource.query(query, params);

    return rows.map((row: any) => ({
      latitud: parseFloat(row.latitud),
      longitud: parseFloat(row.longitud),
      peso: parseInt(row.peso, 10),
      tipoActividad: row.tipo_actividad,
    }));
  }
}

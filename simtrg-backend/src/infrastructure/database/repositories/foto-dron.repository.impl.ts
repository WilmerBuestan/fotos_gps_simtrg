// ============================================================
// ADAPTADOR: FotoDronRepositoryImpl
// Implementa IFotoDronRepository con TypeORM.
// ============================================================

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import {
  IFotoDronRepository,
  CreateFotoDronDto,
  FiltroFotosHeatmapDto,
  PuntoHeatmapFoto,
} from '../../../core/domain/repositories/foto-dron.repository'
import {
  FotoDronDomain,
  OrigenCoordenada,
} from '../../../core/domain/entities/foto-dron.entity'
import { FotoDronOrmEntity } from '../entities/foto-dron.orm-entity'

// Tamaño de celda del grid para heatmap (en grados decimales)
// 0.01 ≈ 1.1km — igual al usado en EventoTacticoRepositoryImpl
const GRID_SIZE = 0.01

@Injectable()
export class FotoDronRepositoryImpl implements IFotoDronRepository {
  constructor(
    @InjectRepository(FotoDronOrmEntity)
    private readonly repo: Repository<FotoDronOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ---- Mapper ----

  private toDomain(orm: FotoDronOrmEntity): FotoDronDomain {
    return new FotoDronDomain(
      orm.id,
      orm.rutaArchivo,
      orm.rutaMiniatura,
      orm.latitud,
      orm.longitud,
      orm.fechaCaptura,
      orm.esCoordenadasManual,
      orm.origenCoordenada,
      orm.operadorId,
      orm.createdAt,
      orm.nombreArchivo,
      orm.tamanoBytes,
      orm.provincia,
      orm.canton,
    )
  }

  // ---- CRUD ----

  async create(data: CreateFotoDronDto): Promise<FotoDronDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      rutaArchivo: data.rutaArchivo,
      rutaMiniatura: data.rutaMiniatura,
      latitud: data.latitud,
      longitud: data.longitud,
      fechaCaptura: data.fechaCaptura,
      esCoordenadasManual: data.esCoordenadasManual,
      origenCoordenada: data.origenCoordenada as OrigenCoordenada,
      operadorId: data.operadorId,
      nombreArchivo: data.nombreArchivo,
      tamanoBytes: data.tamanoBytes,
      provincia: data.provincia ?? null,
      canton: data.canton ?? null,
    })
    const saved = await this.repo.save(orm)
    return this.toDomain(saved)
  }

  async findAll(): Promise<FotoDronDomain[]> {
    const orms = await this.repo.find({ order: { createdAt: 'DESC' } })
    return orms.map((o) => this.toDomain(o))
  }

  async findByOperador(operadorId: string): Promise<FotoDronDomain[]> {
    const orms = await this.repo.find({
      where: { operadorId },
      order: { createdAt: 'DESC' },
    })
    return orms.map((o) => this.toDomain(o))
  }

  async findById(id: string): Promise<FotoDronDomain | null> {
    const ormEntity = await this.repo.findOne({ where: { id } })
    return ormEntity ? this.toDomain(ormEntity) : null
  }

  async update(id: string, data: Partial<CreateFotoDronDto>): Promise<FotoDronDomain> {
    await this.repo.update(id, {
      ...data,
      origenCoordenada: data.origenCoordenada as OrigenCoordenada | undefined,
    })
    const actualizado = await this.findById(id)
    return actualizado!
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  // ---- Heatmap con ST_SnapToGrid (PostGIS) ----
  async generarHeatmap(filtro?: FiltroFotosHeatmapDto): Promise<PuntoHeatmapFoto[]> {
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
        COUNT(*) AS peso
      FROM fotos_dron
      WHERE latitud IS NOT NULL AND longitud IS NOT NULL
    `

    const params: any[] = [GRID_SIZE]
    let paramIdx = 2

    if (filtro?.desde) {
      query += ` AND COALESCE(fecha_captura, created_at) >= $${paramIdx++}`
      params.push(filtro.desde)
    }
    if (filtro?.hasta) {
      query += ` AND COALESCE(fecha_captura, created_at) <= $${paramIdx++}`
      params.push(filtro.hasta)
    }
    if (filtro?.provincia) {
      query += ` AND provincia = $${paramIdx++}`
      params.push(filtro.provincia)
    }

    query += `
      GROUP BY 1, 2
      ORDER BY peso DESC
    `

    const rows = await this.dataSource.query(query, params)

    return rows.map((row: any) => ({
      latitud: parseFloat(row.latitud),
      longitud: parseFloat(row.longitud),
      peso: parseInt(row.peso, 10),
    }))
  }
}

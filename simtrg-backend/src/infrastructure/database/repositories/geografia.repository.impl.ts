// ============================================================
// ADAPTADOR: GeografiaRepositoryImpl
// Resuelve provincia/cantón vía ST_Contains sobre limites_cantones,
// con fallback al cantón más cercano (ST_Distance) si el punto cae
// justo fuera de un polígono por la simplificación de precisión.
// ============================================================

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  IGeografiaRepository,
  UbicacionAdministrativa,
} from '../../../core/domain/repositories/geografia.repository';

// Distancia máxima (grados, ~1km) para aceptar el fallback de "más cercano"
const FALLBACK_MAX_DISTANCIA = 0.01;

@Injectable()
export class GeografiaRepositoryImpl implements IGeografiaRepository {
  constructor(private readonly dataSource: DataSource) {}

  async resolverUbicacion(
    lat: number,
    lon: number,
  ): Promise<UbicacionAdministrativa | null> {
    const contains = await this.dataSource.query(
      `SELECT provincia, canton FROM "limites_cantones"
       WHERE ST_Contains("geom", ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1`,
      [lon, lat],
    );
    if (contains.length > 0) {
      return { provincia: contains[0].provincia, canton: contains[0].canton };
    }

    const nearest = await this.dataSource.query(
      `SELECT provincia, canton,
              ST_Distance("geom", ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS distancia
       FROM "limites_cantones"
       ORDER BY distancia ASC
       LIMIT 1`,
      [lon, lat],
    );
    if (nearest.length > 0 && Number(nearest[0].distancia) <= FALLBACK_MAX_DISTANCIA) {
      return { provincia: nearest[0].provincia, canton: nearest[0].canton };
    }

    return null;
  }
}

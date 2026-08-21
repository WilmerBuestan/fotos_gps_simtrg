// ============================================================
// ADAPTADOR: GeografiaRepositoryImpl
// Resuelve provincia/cantón/parroquia vía ST_Contains sobre
// limites_cantones y limites_parroquias, con fallback al polígono
// más cercano (ST_Distance) si el punto cae justo fuera por la
// simplificación de precisión. Son dos tablas independientes (no un
// JOIN) porque cada una tiene su propia fuente/precisión: que falle
// la resolución de parroquia no debe anular un acierto de cantón.
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
    const cantonInfo = await this.resolverCanton(lat, lon);
    if (!cantonInfo) {
      return null;
    }

    const parroquiaInfo = await this.resolverParroquia(lat, lon);

    return {
      provincia: cantonInfo.provincia,
      canton: cantonInfo.canton,
      parroquia: parroquiaInfo?.parroquia,
      codigoPostal: parroquiaInfo?.codigoInec,
    };
  }

  private async resolverCanton(
    lat: number,
    lon: number,
  ): Promise<{ provincia: string; canton: string } | null> {
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

  private async resolverParroquia(
    lat: number,
    lon: number,
  ): Promise<{ parroquia: string; codigoInec: string } | null> {
    const contains = await this.dataSource.query(
      `SELECT parroquia, codigo_inec FROM "limites_parroquias"
       WHERE ST_Contains("geom", ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1`,
      [lon, lat],
    );
    if (contains.length > 0) {
      return {
        parroquia: contains[0].parroquia,
        codigoInec: contains[0].codigo_inec,
      };
    }

    const nearest = await this.dataSource.query(
      `SELECT parroquia, codigo_inec,
              ST_Distance("geom", ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS distancia
       FROM "limites_parroquias"
       ORDER BY distancia ASC
       LIMIT 1`,
      [lon, lat],
    );
    if (nearest.length > 0 && Number(nearest[0].distancia) <= FALLBACK_MAX_DISTANCIA) {
      return {
        parroquia: nearest[0].parroquia,
        codigoInec: nearest[0].codigo_inec,
      };
    }

    return null;
  }
}

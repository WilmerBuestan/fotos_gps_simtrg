// ============================================================
// PUERTO: IGeografiaRepository
// Geocodificación inversa (lat/lon -> provincia/cantón) real,
// vía polígonos administrativos (PostGIS). Capa: Core > Domain.
// ============================================================

export interface UbicacionAdministrativa {
  provincia: string;
  canton: string;
}

export abstract class IGeografiaRepository {
  abstract resolverUbicacion(
    lat: number,
    lon: number,
  ): Promise<UbicacionAdministrativa | null>;
}

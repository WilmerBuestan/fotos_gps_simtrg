// ============================================================
// ENTIDAD DE DOMINIO: FotoDron
// Capa: Core > Domain
// Sin dependencias externas. Reglas de negocio puras.
// ============================================================

import { CoordenadasYaAsignadasException } from '../exceptions/foto-dron.exceptions';

export enum OrigenCoordenada {
  GPS_EXIF = 'GPS_EXIF',       // Extraída automáticamente del EXIF
  MANUAL = 'MANUAL',           // Ingresada manualmente por el operador
}

export class FotoDronDomain {
  constructor(
    public readonly id: string,
    public rutaArchivo: string,
    public rutaMiniatura: string,
    public latitud: number | null,
    public longitud: number | null,
    public fechaCaptura: Date | null,
    public esCoordenadasManual: boolean,
    public origenCoordenada: OrigenCoordenada | null,
    public operadorId: string,
    public readonly createdAt: Date,
    public nombreArchivo: string,
    public tamanoBytes: number,
    public provincia?: string | null,
    public canton?: string | null,
  ) {}

  // ---- Reglas de negocio ----

  tieneCoordenadas(): boolean {
    return this.latitud !== null && this.longitud !== null;
  }

  requiereCoordenadasManuales(): boolean {
    return !this.tieneCoordenadas();
  }

  asignarCoordenadasManuales(lat: number, lon: number): void {
    if (this.tieneCoordenadas()) {
      throw new CoordenadasYaAsignadasException();
    }
    this.latitud = lat;
    this.longitud = lon;
    this.esCoordenadasManual = true;
    this.origenCoordenada = OrigenCoordenada.MANUAL;
  }
}

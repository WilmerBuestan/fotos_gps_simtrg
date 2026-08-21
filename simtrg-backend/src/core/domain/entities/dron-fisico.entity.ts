// ============================================================
// ENTIDAD DE DOMINIO: DronFisico
// Capa: Core > Domain
// Representa un dron FÍSICO como equipo de bodega (no confundir
// con FotoDronDomain, que son las fotos capturadas por un dron).
// ============================================================

export enum EstadoDronFisico {
  DISPONIBLE = 'DISPONIBLE',
  PRESTADO = 'PRESTADO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  BAJA = 'BAJA',
}

export class DronFisicoDomain {
  constructor(
    public readonly id: string,
    public codigoInterno: string,
    public modelo: string,
    public marca: string | null,
    public tagRfid: string | null,
    public estado: EstadoDronFisico,
    public observaciones: string | null,
    public activo: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  // ---- Reglas de negocio ----

  puedeSerPrestado(): boolean {
    return this.estado === EstadoDronFisico.DISPONIBLE;
  }
}

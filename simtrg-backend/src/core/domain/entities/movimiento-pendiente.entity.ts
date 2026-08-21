// ============================================================
// ENTIDAD DE DOMINIO: MovimientoPendiente
// Capa: Core > Domain
// Se crea cuando el ESP32 solo logra escanear una tarjeta (la del
// dron o la del usuario, no ambas — caso "tarjeta perdida"). Queda
// a la espera de que alguien complete el lado faltante desde la web.
// ============================================================

export enum TipoMovimientoPendiente {
  FALTA_USUARIO = 'FALTA_USUARIO',
  FALTA_DRON = 'FALTA_DRON',
}

export class MovimientoPendienteDomain {
  constructor(
    public readonly id: string,
    public tipo: TipoMovimientoPendiente,
    public dronId: string | null,
    public usuarioId: string | null,
    public tagConocido: string,
    public resuelto: boolean,
    public resueltoPorId: string | null,
    public prestamoId: string | null,
    public fechaResolucion: Date | null,
    public readonly createdAt: Date,
    // Datos expandidos opcionales (joins) para respuestas enriquecidas
    public dronCodigoInterno?: string,
    public usuarioNombreCompleto?: string,
  ) {}
}

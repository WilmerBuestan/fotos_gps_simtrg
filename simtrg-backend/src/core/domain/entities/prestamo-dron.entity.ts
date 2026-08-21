// ============================================================
// ENTIDAD DE DOMINIO: PrestamoDron
// Capa: Core > Domain
// Un registro con fechaEntrada = null es un préstamo "en curso"
// (el dron todavía está afuera); al devolverse se completa la
// misma fila, no se crea una nueva.
// ============================================================

export enum OrigenPrestamoDron {
  ESP32 = 'ESP32',
  MANUAL = 'MANUAL',
}

export class PrestamoDronDomain {
  constructor(
    public readonly id: string,
    public dronId: string,
    public usuarioSalidaId: string,
    public fechaSalida: Date,
    public usuarioEntradaId: string | null,
    public fechaEntrada: Date | null,
    public origen: OrigenPrestamoDron,
    public observaciones: string | null,
    public readonly createdAt: Date,
    // Datos expandidos opcionales (joins) para respuestas enriquecidas
    public dronCodigoInterno?: string,
    public usuarioSalidaNombre?: string,
    public usuarioEntradaNombre?: string,
  ) {}

  // ---- Reglas de negocio ----

  estaEnCurso(): boolean {
    return this.fechaEntrada === null;
  }
}

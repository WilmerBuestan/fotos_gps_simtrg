// ============================================================
// ENTIDAD DE DOMINIO: TareaMantenimiento
// Capa: Core > Domain
// Tarea de mantenimiento asociada a un dron físico, con prioridad
// y técnico asignado (nombre libre, no un rol del sistema).
// ============================================================

export enum PrioridadTarea {
  ALTA = 'ALTA',
  MEDIA = 'MEDIA',
  BAJA = 'BAJA',
}

export enum EstadoTarea {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
}

export class TareaMantenimientoDomain {
  constructor(
    public readonly id: string,
    public dronId: string,
    public descripcion: string,
    public prioridad: PrioridadTarea,
    public tecnicoAsignado: string | null,
    public estado: EstadoTarea,
    public creadoPorId: string,
    public readonly fechaCreacion: Date,
    public fechaCompletada: Date | null,
    // Datos expandidos opcionales (joins)
    public dronCodigoInterno?: string,
  ) {}
}

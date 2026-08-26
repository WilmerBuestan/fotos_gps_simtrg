// ============================================================
// ENTIDAD DE DOMINIO: EventoTactico
// Reporte de inteligencia georreferenciado.
// Base del Monitor Táctico de Calor (Módulo B).
// ============================================================

import { EventoFotoDomain } from './evento-foto.entity';

export class EventoTacticoDomain {
  constructor(
    public readonly id: string,
    public fechaHora: Date,
    public latitud: number,
    public longitud: number,
    public tipoActividadId: string,
    public descripcionDetallada: string,
    public operadorId: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    // Datos expandidos opcionales (joins)
    public tipoActividadNombre?: string,
    public operadorNombre?: string,
    public fotos?: EventoFotoDomain[],
    public provincia?: string | null,
    public canton?: string | null,
    public parroquia?: string | null,
    // El frontend espera este objeto anidado (evento.tipoActividad.nombre),
    // no solo el string plano de arriba — sin esto, los gráficos y popups
    // que leen tipoActividad?.nombre caen todos al valor por defecto.
    public tipoActividad?: { id: string; nombre: string },
  ) {}

  // ---- Reglas de negocio ----

  tieneCoordenadas(): boolean {
    return this.latitud !== null && this.longitud !== null;
  }

  esFuturo(): boolean {
    return this.fechaHora > new Date();
  }

  antiguedadEnDias(): number {
    const diff = new Date().getTime() - this.fechaHora.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

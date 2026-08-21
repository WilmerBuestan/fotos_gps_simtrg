// ============================================================
// PUERTOS: ITipoActividadRepository + IEventoTacticoRepository
// ============================================================

import { TipoActividadDomain } from '../entities/tipo-actividad.entity';
import { EventoTacticoDomain } from '../entities/evento-tactico.entity';

// ---- TipoActividad ----

export interface CreateTipoActividadDto {
  nombre: string;
  descripcion?: string;
}

export abstract class ITipoActividadRepository {
  abstract findAll(soloActivos?: boolean): Promise<TipoActividadDomain[]>;
  abstract findById(id: string): Promise<TipoActividadDomain | null>;
  abstract findByNombre(nombre: string): Promise<TipoActividadDomain | null>;
  abstract create(data: CreateTipoActividadDto): Promise<TipoActividadDomain>;
  abstract update(id: string, data: Partial<CreateTipoActividadDto & { activo: boolean }>): Promise<TipoActividadDomain>;
}

// ---- EventoTactico ----

export interface CreateEventoTacticoDto {
  fechaHora: Date;
  latitud: number;
  longitud: number;
  tipoActividadId: string;
  descripcionDetallada: string;
  operadorId: string;
  provincia?: string | null;
  canton?: string | null;
  parroquia?: string | null;
}

export interface FiltroEventosDto {
  desde?: Date;
  hasta?: Date;
  tipoActividadId?: string;
  operadorId?: string;
  provincia?: string;
}

export interface PuntoHeatmap {
  latitud: number;
  longitud: number;
  peso: number; // densidad de eventos en ese punto
  tipoActividad: string;
}

export abstract class IEventoTacticoRepository {
  abstract create(data: CreateEventoTacticoDto): Promise<EventoTacticoDomain>;
  abstract findAll(filtro?: FiltroEventosDto): Promise<EventoTacticoDomain[]>;
  abstract findById(id: string): Promise<EventoTacticoDomain | null>;
  abstract findByOperador(operadorId: string): Promise<EventoTacticoDomain[]>;
  abstract update(
    id: string,
    data: Partial<Omit<CreateEventoTacticoDto, 'operadorId'>>,
  ): Promise<EventoTacticoDomain>;
  abstract delete(id: string): Promise<void>;
  abstract generarHeatmap(filtro?: FiltroEventosDto): Promise<PuntoHeatmap[]>;
}

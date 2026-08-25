// ============================================================
// PUERTO: ITareaMantenimientoRepository
// Capa: Core > Domain
// ============================================================

import { TareaMantenimientoDomain, PrioridadTarea } from '../entities/tarea-mantenimiento.entity';

export interface CreateTareaMantenimientoDto {
  dronId: string;
  descripcion: string;
  prioridad: PrioridadTarea;
  tecnicoAsignado?: string | null;
  creadoPorId: string;
}

export interface FiltroTareasMantenimientoDto {
  dronId?: string;
  soloPendientes?: boolean;
}

export abstract class ITareaMantenimientoRepository {
  abstract create(data: CreateTareaMantenimientoDto): Promise<TareaMantenimientoDomain>;
  abstract findById(id: string): Promise<TareaMantenimientoDomain | null>;
  abstract findAll(filtro?: FiltroTareasMantenimientoDto): Promise<TareaMantenimientoDomain[]>;
  abstract completar(id: string): Promise<TareaMantenimientoDomain>;
}

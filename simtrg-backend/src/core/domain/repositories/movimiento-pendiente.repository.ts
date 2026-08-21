// ============================================================
// PUERTO: IMovimientoPendienteRepository
// Capa: Core > Domain
// ============================================================

import {
  MovimientoPendienteDomain,
  TipoMovimientoPendiente,
} from '../entities/movimiento-pendiente.entity';

export interface CreateMovimientoPendienteDto {
  tipo: TipoMovimientoPendiente;
  dronId?: string | null;
  usuarioId?: string | null;
  tagConocido: string;
}

export abstract class IMovimientoPendienteRepository {
  abstract create(data: CreateMovimientoPendienteDto): Promise<MovimientoPendienteDomain>;
  abstract findById(id: string): Promise<MovimientoPendienteDomain | null>;
  abstract findPendientes(): Promise<MovimientoPendienteDomain[]>;
  abstract marcarResuelto(
    id: string,
    resueltoPorId: string,
    prestamoId: string | null,
  ): Promise<MovimientoPendienteDomain>;
}

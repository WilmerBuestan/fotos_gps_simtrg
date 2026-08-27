// ============================================================
// PUERTO: IPrestamoDronRepository
// Capa: Core > Domain
// ============================================================

import { PrestamoDronDomain, OrigenPrestamoDron } from '../entities/prestamo-dron.entity';

export interface CreatePrestamoDronDto {
  dronId: string;
  usuarioSalidaId: string;
  origen: OrigenPrestamoDron;
  observaciones?: string | null;
}

export interface FiltroPrestamosDto {
  dronId?: string;
  usuarioId?: string;
  desde?: Date;
  hasta?: Date;
  soloEnCurso?: boolean;
}

export abstract class IPrestamoDronRepository {
  abstract create(data: CreatePrestamoDronDto): Promise<PrestamoDronDomain>;
  abstract findById(id: string): Promise<PrestamoDronDomain | null>;
  abstract findPrestamoEnCurso(dronId: string): Promise<PrestamoDronDomain | null>;
  abstract registrarEntrada(
    id: string,
    usuarioEntradaId: string,
    observaciones?: string | null,
  ): Promise<PrestamoDronDomain>;
  abstract findAll(filtro?: FiltroPrestamosDto): Promise<PrestamoDronDomain[]>;
  abstract delete(id: string): Promise<void>;
}

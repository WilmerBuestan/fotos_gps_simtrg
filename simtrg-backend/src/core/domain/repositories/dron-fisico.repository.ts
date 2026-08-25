// ============================================================
// PUERTO: IDronFisicoRepository
// Capa: Core > Domain
// ============================================================

import { DronFisicoDomain, EstadoDronFisico } from '../entities/dron-fisico.entity';

export interface CreateDronFisicoDto {
  codigoInterno: string;
  modelo: string;
  marca?: string | null;
  version?: string | null;
  tagRfid?: string | null;
  observaciones?: string | null;
  anioCompra?: number | null;
}

export interface UpdateDronFisicoDto {
  codigoInterno?: string;
  modelo?: string;
  marca?: string | null;
  version?: string | null;
  tagRfid?: string | null;
  estado?: EstadoDronFisico;
  observaciones?: string | null;
  activo?: boolean;
  foto?: string | null;
  anioCompra?: number | null;
  horasVuelo?: number;
  bateriaPorcentaje?: number | null;
  bateriaActualizada?: Date | null;
  ubicacionBodega?: string | null;
}

export abstract class IDronFisicoRepository {
  abstract create(data: CreateDronFisicoDto): Promise<DronFisicoDomain>;
  abstract findAll(): Promise<DronFisicoDomain[]>;
  abstract findById(id: string): Promise<DronFisicoDomain | null>;
  abstract findByTagRfid(tagRfid: string): Promise<DronFisicoDomain | null>;
  abstract findByCodigoInterno(codigoInterno: string): Promise<DronFisicoDomain | null>;
  abstract update(id: string, data: UpdateDronFisicoDto): Promise<DronFisicoDomain>;
}

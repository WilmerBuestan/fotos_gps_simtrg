// ============================================================
// PUERTO: IAuditoriaLogRepository
// Capa: Core > Domain
// ============================================================

import {
  AuditoriaLogDomain,
  TipoEventoAuditoria,
} from '../entities/auditoria-log.entity';

export interface CrearAuditoriaLogDto {
  tipoEvento: TipoEventoAuditoria;
  metodoHttp: string;
  url: string;
  usuarioId?: string | null;
  username?: string | null;
  rol?: string | null;
  ip?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  provincia?: string | null;
  canton?: string | null;
  parroquia?: string | null;
  detalle?: Record<string, unknown> | null;
  exitoso: boolean;
  mensajeError?: string | null;
}

export interface FiltroLogsDto {
  tipoEvento?: TipoEventoAuditoria;
  fechaDesde?: Date;
  fechaHasta?: Date;
  page: number;
  limit: number;
}

export interface LogsPaginados {
  data: AuditoriaLogDomain[];
  total: number;
  page: number;
  limit: number;
}

export abstract class IAuditoriaLogRepository {
  abstract crear(data: CrearAuditoriaLogDto): Promise<void>;
  abstract findAllPaginado(filtro: FiltroLogsDto): Promise<LogsPaginados>;
}

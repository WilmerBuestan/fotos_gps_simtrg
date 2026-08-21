// ============================================================
// CASO DE USO: RegistrarLog
// Capa: Core > Use Cases > Auditoria
// Resuelve provincia/cantón/parroquia si hay coordenadas y guarda
// el evento. Nunca debe propagar un error: un fallo al auditar no
// puede romper la operación que se está auditando.
// ============================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAuditoriaLogRepository } from '../../domain/repositories/auditoria-log.repository';
import { IGeografiaRepository } from '../../domain/repositories/geografia.repository';
import { TipoEventoAuditoria } from '../../domain/entities/auditoria-log.entity';

const CAMPOS_SENSIBLES = ['password', 'nuevaPassword', 'passwordHash', 'accessToken'];

export interface RegistrarLogInputDto {
  tipoEvento: TipoEventoAuditoria;
  metodoHttp: string;
  url: string;
  usuarioId?: string | null;
  username?: string | null;
  rol?: string | null;
  ip?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  detalle?: Record<string, unknown> | null;
  exitoso: boolean;
  mensajeError?: string | null;
}

function sanitizarDetalle(
  detalle?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!detalle) return null;
  const limpio: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detalle)) {
    if (CAMPOS_SENSIBLES.includes(key)) continue;
    limpio[key] = value;
  }
  return limpio;
}

@Injectable()
export class RegistrarLogUseCase {
  private readonly logger = new Logger('AUDITORIA');

  constructor(
    @Inject(IAuditoriaLogRepository)
    private readonly auditoriaLogRepository: IAuditoriaLogRepository,
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
  ) {}

  async execute(input: RegistrarLogInputDto): Promise<void> {
    try {
      let provincia: string | null = null;
      let canton: string | null = null;
      let parroquia: string | null = null;

      if (input.latitud != null && input.longitud != null) {
        const ubicacion = await this.geografiaRepository
          .resolverUbicacion(input.latitud, input.longitud)
          .catch(() => null);
        if (ubicacion) {
          provincia = ubicacion.provincia;
          canton = ubicacion.canton;
          parroquia = ubicacion.parroquia ?? null;
        }
      }

      await this.auditoriaLogRepository.crear({
        tipoEvento: input.tipoEvento,
        metodoHttp: input.metodoHttp,
        url: input.url,
        usuarioId: input.usuarioId,
        username: input.username,
        rol: input.rol,
        ip: input.ip,
        latitud: input.latitud,
        longitud: input.longitud,
        provincia,
        canton,
        parroquia,
        detalle: sanitizarDetalle(input.detalle),
        exitoso: input.exitoso,
        mensajeError: input.mensajeError,
      });
    } catch (error) {
      this.logger.warn(`No se pudo persistir el log de auditoría: ${(error as Error).message}`);
    }
  }
}

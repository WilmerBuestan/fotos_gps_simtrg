// ============================================================
// INTERCEPTOR: AuditoriaInterceptor (Mini-SIEM)
// Registra en consola y en la tabla 'auditoria_logs' todos los
// eventos de escritura: POST, PUT, PATCH, DELETE. Gateado por
// AUDIT_LOG_ENABLED.
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, tap } from 'rxjs';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';
import { RegistrarLogUseCase } from '../../../core/use-cases/auditoria/registrar-log.use-case';
import { TipoEventoAuditoria } from '../../../core/domain/entities/auditoria-log.entity';

const METODOS_AUDITADOS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// /auth/login y /auth/logout ya generan su propio evento LOGIN/LOGOUT
// (más preciso, con resolución de ubicación) desde sus casos de uso;
// auditarlos también aquí duplicaría cada acceso como un CREATE genérico.
const URLS_EXCLUIDAS = ['/api/v1/auth/login', '/api/v1/auth/logout'];

const TIPO_POR_METODO: Record<string, TipoEventoAuditoria> = {
  POST: TipoEventoAuditoria.CREATE,
  PUT: TipoEventoAuditoria.UPDATE,
  PATCH: TipoEventoAuditoria.UPDATE,
  DELETE: TipoEventoAuditoria.DELETE,
};

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDITORIA');

  constructor(
    private readonly registrarLogUseCase: RegistrarLogUseCase,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, body } = req;
    const user: JwtPayload | undefined = req.user;
    const timestamp = new Date().toISOString();

    if (!METODOS_AUDITADOS.includes(method) || URLS_EXCLUIDAS.includes(url)) {
      return next.handle();
    }

    const auditoriaHabilitada = this.configService.get('AUDIT_LOG_ENABLED') !== 'false';
    // Solo fotos/eventos traen coordenadas en el body de creación; en
    // usuarios/catálogos simplemente no aplica y queda null.
    const latitud = typeof body?.latitud === 'number' ? body.latitud : null;
    const longitud = typeof body?.longitud === 'number' ? body.longitud : null;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              timestamp,
              evento: 'ESCRITURA_EXITOSA',
              method,
              url,
              ip,
              usuario_id: user?.sub ?? 'ANONIMO',
              username: user?.username ?? 'ANONIMO',
              rol: user?.rol ?? 'N/A',
            }),
          );
          if (auditoriaHabilitada) {
            void this.registrarLogUseCase.execute({
              tipoEvento: TIPO_POR_METODO[method],
              metodoHttp: method,
              url,
              usuarioId: user?.sub ?? null,
              username: user?.username ?? null,
              rol: user?.rol ?? null,
              ip: ip ?? null,
              latitud,
              longitud,
              exitoso: true,
            });
          }
        },
        error: (error) => {
          this.logger.warn(
            JSON.stringify({
              timestamp,
              evento: 'ERROR_ESCRITURA',
              method,
              url,
              ip,
              usuario_id: user?.sub ?? 'ANONIMO',
              error: error.message,
            }),
          );
          if (auditoriaHabilitada) {
            void this.registrarLogUseCase.execute({
              tipoEvento: TIPO_POR_METODO[method],
              metodoHttp: method,
              url,
              usuarioId: user?.sub ?? null,
              username: user?.username ?? null,
              rol: user?.rol ?? null,
              ip: ip ?? null,
              latitud,
              longitud,
              exitoso: false,
              mensajeError: error?.message ?? 'Error desconocido',
            });
          }
        },
      }),
    );
  }
}

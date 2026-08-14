// ============================================================
// INTERCEPTOR: AuditoriaInterceptor (Mini-SIEM)
// Registra en consola (y eventualmente en BD) todos los
// eventos de escritura: POST, PUT, PATCH, DELETE.
// En producción, persistir en tabla 'auditoria_logs'.
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';

const METODOS_AUDITADOS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDITORIA');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const user: JwtPayload | undefined = req.user;
    const timestamp = new Date().toISOString();

    if (!METODOS_AUDITADOS.includes(method)) {
      return next.handle();
    }

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
          // TODO: Persistir en tabla 'auditoria_logs' de PostgreSQL
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
        },
      }),
    );
  }
}

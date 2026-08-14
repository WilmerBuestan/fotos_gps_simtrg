// ============================================================
// FILTRO GLOBAL: DomainExceptionFilter
// Convierte excepciones de dominio en respuestas HTTP apropiadas.
// Mantiene el dominio desacoplado de HTTP.
// ============================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  UsuarioNoEncontradoException,
  UsernameYaExisteException,
  CredencialesInvalidasException,
  UsuarioInactivoException,
  AccesoNoAutorizadoException,
} from '../../../core/domain/exceptions/domain.exceptions';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = this.getHttpStatus(exception);

    this.logger.warn(
      `[${exception.name}] ${exception.message} | ${request.method} ${request.url}`,
    );

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getHttpStatus(exception: DomainException): number {
    if (exception instanceof UsuarioNoEncontradoException) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof UsernameYaExisteException) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof CredencialesInvalidasException) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (exception instanceof UsuarioInactivoException) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof AccesoNoAutorizadoException) {
      return HttpStatus.FORBIDDEN;
    }
    return HttpStatus.BAD_REQUEST;
  }
}

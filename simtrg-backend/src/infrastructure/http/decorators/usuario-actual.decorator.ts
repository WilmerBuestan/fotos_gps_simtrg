import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';

/**
 * Extrae el usuario autenticado del request.
 *
 * @example
 * @Get('perfil')
 * getPerfil(@UsuarioActual() user: JwtPayload) { ... }
 */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

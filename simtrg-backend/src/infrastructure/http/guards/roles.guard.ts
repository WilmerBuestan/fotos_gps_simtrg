// ============================================================
// GUARD RBAC: RolesGuard
// Verifica que el usuario autenticado tenga el rol requerido.
// Se usa junto con el decorador @Roles(...)
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '../../../core/domain/entities/usuario.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay roles requeridos, la ruta es accesible para cualquier usuario autenticado
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado.');
    }

    const tienePermiso = rolesRequeridos.includes(user.rol);

    if (!tienePermiso) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesRequeridos.join(', ')}`,
      );
    }

    return true;
  }
}

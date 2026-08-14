import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../../../core/domain/entities/usuario.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorador para restringir acceso a endpoints por rol.
 *
 * @example
 * @Roles(RolUsuario.ADMINISTRADOR)
 * @Get('usuarios')
 * findAll() { ... }
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);

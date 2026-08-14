import { RolUsuario } from '../../core/domain/entities/usuario.entity';

export interface JwtPayload {
  sub: string;       // ID del usuario
  username: string;
  rol: RolUsuario;
  iat?: number;      // Issued at (auto-generado por JWT)
  exp?: number;      // Expiration (auto-generado por JWT)
}

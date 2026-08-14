// ============================================================
// CASO DE USO: Login
// Capa: Core > Use Cases > Auth
// Orquesta: validar credenciales → registrar acceso → emitir JWT
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import {
  CredencialesInvalidasException,
  UsuarioInactivoException,
} from '../../domain/exceptions/domain.exceptions';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';

export interface LoginInputDto {
  username: string;
  password: string;
}

export interface LoginOutputDto {
  accessToken: string;
  usuario: {
    id: string;
    nombreCompleto: string;
    username: string;
    rol: string;
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInputDto): Promise<LoginOutputDto> {
    // 1. Buscar usuario por username
    const usuario = await this.usuarioRepository.findByUsername(input.username);
    if (!usuario) {
      // No revelar si el usuario existe o no (seguridad)
      throw new CredencialesInvalidasException();
    }

    // 2. Verificar que la cuenta esté activa
    if (!usuario.activo) {
      throw new UsuarioInactivoException();
    }

    // 3. Comparar contraseña con hash
    const passwordValida = await bcrypt.compare(
      input.password,
      usuario.passwordHash,
    );
    if (!passwordValida) {
      throw new CredencialesInvalidasException();
    }

    // 4. Registrar último acceso
    usuario.registrarAcceso();
    await this.usuarioRepository.update(usuario.id, {
      ultimoAcceso: usuario.ultimoAcceso,
    });

    // 5. Generar JWT con payload mínimo necesario
    const payload: JwtPayload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        username: usuario.username,
        rol: usuario.rol,
      },
    };
  }
}

// ============================================================
// CASO DE USO: Login
// Capa: Core > Use Cases > Auth
// Orquesta: validar credenciales → registrar acceso → emitir JWT
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import { IGeografiaRepository } from '../../domain/repositories/geografia.repository';
import {
  CredencialesInvalidasException,
  UsuarioInactivoException,
} from '../../domain/exceptions/domain.exceptions';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';
import { RegistrarLogUseCase } from '../auditoria/registrar-log.use-case';
import { TipoEventoAuditoria } from '../../domain/entities/auditoria-log.entity';

export interface LoginInputDto {
  username: string;
  password: string;
  latitud?: number;
  longitud?: number;
  ip?: string;
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
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
    private readonly jwtService: JwtService,
    private readonly registrarLogUseCase: RegistrarLogUseCase,
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

    // 4. Registrar último acceso y (si hay coordenadas) última ubicación
    usuario.registrarAcceso();

    let provincia: string | undefined;
    let canton: string | undefined;
    let parroquia: string | undefined;
    if (input.latitud != null && input.longitud != null) {
      const ubicacion = await this.geografiaRepository
        .resolverUbicacion(input.latitud, input.longitud)
        .catch(() => null);
      provincia = ubicacion?.provincia;
      canton = ubicacion?.canton;
      parroquia = ubicacion?.parroquia;
      usuario.actualizarUbicacion(input.latitud, input.longitud, provincia, canton, parroquia);
    }

    await this.usuarioRepository.update(usuario.id, {
      ultimoAcceso: usuario.ultimoAcceso,
      ...(input.latitud != null &&
        input.longitud != null && {
          ultimaUbicacionLat: input.latitud,
          ultimaUbicacionLon: input.longitud,
          ultimaUbicacionProvincia: provincia,
          ultimaUbicacionCanton: canton,
          ultimaUbicacionParroquia: parroquia,
          ultimaUbicacionFecha: usuario.ultimaUbicacionFecha,
        }),
    });

    await this.registrarLogUseCase.execute({
      tipoEvento: TipoEventoAuditoria.LOGIN,
      metodoHttp: 'POST',
      url: '/auth/login',
      usuarioId: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      ip: input.ip ?? null,
      latitud: input.latitud ?? null,
      longitud: input.longitud ?? null,
      exitoso: true,
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

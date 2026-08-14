// ============================================================
// CASO DE USO: CrearUsuario
// Capa: Core > Use Cases > Users
// Solo puede ejecutarlo un ADMINISTRADOR.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  IUsuarioRepository,
  CreateUsuarioDto,
} from '../../domain/repositories/usuario.repository';
import { RolUsuario } from '../../domain/entities/usuario.entity';
import { UsernameYaExisteException } from '../../domain/exceptions/domain.exceptions';

export interface CrearUsuarioInputDto {
  nombre: string;
  apellido: string;
  username: string;
  password: string;
  rol: RolUsuario;
}

export interface CrearUsuarioOutputDto {
  id: string;
  nombreCompleto: string;
  username: string;
  rol: string;
  activo: boolean;
  createdAt: Date;
}

const SALT_ROUNDS = 12;

@Injectable()
export class CrearUsuarioUseCase {
  constructor(
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async execute(input: CrearUsuarioInputDto): Promise<CrearUsuarioOutputDto> {
    // 1. Verificar que el username no exista
    const yaExiste = await this.usuarioRepository.existsByUsername(
      input.username,
    );
    if (yaExiste) {
      throw new UsernameYaExisteException(input.username);
    }

    // 2. Hashear contraseña con Bcrypt
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // 3. Crear el usuario en el repositorio
    const data: CreateUsuarioDto = {
      nombre: input.nombre,
      apellido: input.apellido,
      username: input.username,
      passwordHash,
      rol: input.rol,
    };

    const usuarioCreado = await this.usuarioRepository.create(data);

    return {
      id: usuarioCreado.id,
      nombreCompleto: usuarioCreado.nombreCompleto,
      username: usuarioCreado.username,
      rol: usuarioCreado.rol,
      activo: usuarioCreado.activo,
      createdAt: usuarioCreado.createdAt,
    };
  }
}

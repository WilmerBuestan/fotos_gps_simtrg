// ============================================================
// CASO DE USO: ActualizarUsuario
// Capa: Core > Use Cases > Users
// Solo puede ejecutarlo un ADMINISTRADOR.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import { RolUsuario } from '../../domain/entities/usuario.entity';
import {
  UsuarioNoEncontradoException,
  NoPuedeModificarseASiMismoException,
  UltimoAdministradorException,
} from '../../domain/exceptions/domain.exceptions';

export interface ActualizarUsuarioInputDto {
  id: string;
  actorId: string;
  nombre?: string;
  apellido?: string;
  nuevaPassword?: string;
  rol?: RolUsuario;
  activo?: boolean;
  tagRfid?: string | null;
}

export interface ActualizarUsuarioOutputDto {
  id: string;
  nombreCompleto: string;
  username: string;
  rol: string;
  activo: boolean;
  tagRfid?: string;
}

const SALT_ROUNDS = 12;

@Injectable()
export class ActualizarUsuarioUseCase {
  constructor(
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async execute(
    input: ActualizarUsuarioInputDto,
  ): Promise<ActualizarUsuarioOutputDto> {
    const usuario = await this.usuarioRepository.findById(input.id);
    if (!usuario) {
      throw new UsuarioNoEncontradoException(input.id);
    }

    const esSobreSiMismo = input.id === input.actorId;

    const bajaRol =
      input.rol !== undefined &&
      input.rol !== RolUsuario.ADMINISTRADOR &&
      usuario.rol === RolUsuario.ADMINISTRADOR;
    const desactiva = input.activo === false && usuario.activo;

    if (esSobreSiMismo && (bajaRol || desactiva)) {
      throw new NoPuedeModificarseASiMismoException(
        desactiva ? 'desactivar' : 'quitarle el rol de Administrador a',
      );
    }

    if (bajaRol || desactiva) {
      await this.asegurarQueQuedeOtroAdministrador(usuario.id);
    }

    const passwordHash = input.nuevaPassword
      ? await bcrypt.hash(input.nuevaPassword, SALT_ROUNDS)
      : undefined;

    const actualizado = await this.usuarioRepository.update(input.id, {
      nombre: input.nombre,
      apellido: input.apellido,
      passwordHash,
      rol: input.rol,
      activo: input.activo,
      tagRfid: input.tagRfid,
    });

    return {
      id: actualizado.id,
      nombreCompleto: actualizado.nombreCompleto,
      username: actualizado.username,
      rol: actualizado.rol,
      activo: actualizado.activo,
      tagRfid: actualizado.tagRfid,
    };
  }

  private async asegurarQueQuedeOtroAdministrador(
    idExcluido: string,
  ): Promise<void> {
    const todos = await this.usuarioRepository.findAll();
    const otrosAdminsActivos = todos.filter(
      (u) =>
        u.id !== idExcluido &&
        u.rol === RolUsuario.ADMINISTRADOR &&
        u.activo,
    );
    if (otrosAdminsActivos.length === 0) {
      throw new UltimoAdministradorException();
    }
  }
}

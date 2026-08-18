// ============================================================
// CASO DE USO: EliminarUsuario
// Capa: Core > Use Cases > Users
// Solo puede ejecutarlo un ADMINISTRADOR.
// Elimina físicamente el registro. Si el usuario tiene fotos o
// eventos asociados, la base de datos rechaza el borrado (ON
// DELETE RESTRICT) para no perder el rastro de auditoría; en ese
// caso se recomienda desactivar la cuenta en vez de eliminarla.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import { RolUsuario } from '../../domain/entities/usuario.entity';
import {
  UsuarioNoEncontradoException,
  NoPuedeModificarseASiMismoException,
  UltimoAdministradorException,
  UsuarioConRegistrosAsociadosException,
} from '../../domain/exceptions/domain.exceptions';

const CODIGO_POSTGRES_FK_VIOLATION = '23503';

@Injectable()
export class EliminarUsuarioUseCase {
  constructor(
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async execute(id: string, actorId: string): Promise<void> {
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new UsuarioNoEncontradoException(id);
    }

    if (id === actorId) {
      throw new NoPuedeModificarseASiMismoException('eliminar');
    }

    if (usuario.rol === RolUsuario.ADMINISTRADOR && usuario.activo) {
      const todos = await this.usuarioRepository.findAll();
      const otrosAdminsActivos = todos.filter(
        (u) => u.id !== id && u.rol === RolUsuario.ADMINISTRADOR && u.activo,
      );
      if (otrosAdminsActivos.length === 0) {
        throw new UltimoAdministradorException();
      }
    }

    try {
      await this.usuarioRepository.delete(id);
    } catch (error: any) {
      const codigo = error?.code ?? error?.driverError?.code;
      if (codigo === CODIGO_POSTGRES_FK_VIOLATION) {
        throw new UsuarioConRegistrosAsociadosException();
      }
      throw error;
    }
  }
}

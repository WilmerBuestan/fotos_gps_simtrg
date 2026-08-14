// ============================================================
// CASO DE USO: ObtenerUsuarios
// Capa: Core > Use Cases > Users
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import { UsuarioNoEncontradoException } from '../../domain/exceptions/domain.exceptions';

export interface UsuarioResponseDto {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  username: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: Date | undefined;
  createdAt: Date;
}

@Injectable()
export class ObtenerUsuariosUseCase {
  constructor(
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async findAll(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuarioRepository.findAll();
    return usuarios.map(this.toResponse);
  }

  async findById(id: string): Promise<UsuarioResponseDto> {
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new UsuarioNoEncontradoException(id);
    }
    return this.toResponse(usuario);
  }

  private toResponse(usuario: any): UsuarioResponseDto {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      nombreCompleto: usuario.nombreCompleto,
      username: usuario.username,
      rol: usuario.rol,
      activo: usuario.activo,
      ultimoAcceso: usuario.ultimoAcceso,
      createdAt: usuario.createdAt,
    };
  }
}

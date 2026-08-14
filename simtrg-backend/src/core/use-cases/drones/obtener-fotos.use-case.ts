import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { IFotoDronRepository } from '../../domain/repositories/foto-dron.repository'
import { JwtPayload } from '../../../shared/types/jwt-payload.type'
import { RolUsuario } from '../../domain/entities/usuario.entity'

@Injectable()
export class ObtenerFotosUseCase {
  constructor(private fotoDronRepository: IFotoDronRepository) {}

  async findAll(user: JwtPayload) {
    if (user.rol === RolUsuario.OPERADOR) {
      return this.fotoDronRepository.findByOperador(user.sub)
    }
    return this.fotoDronRepository.findAll()
  }

  async deleteById(id: string, user: JwtPayload) {
    const foto = await this.fotoDronRepository.findById(id)
    if (!foto) {
      throw new NotFoundException('Foto no encontrada')
    }

    if (user.rol === RolUsuario.OPERADOR && foto.operadorId !== user.sub) {
      throw new ForbiddenException('No puedes eliminar fotos de otros operadores')
    }

    await this.fotoDronRepository.delete(id)
    return { message: 'Foto eliminada correctamente' }
  }
}

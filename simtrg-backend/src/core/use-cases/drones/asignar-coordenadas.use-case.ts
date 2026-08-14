// ============================================================
// CASO DE USO: AsignarCoordenadasManualesUseCase
// Permite fijar coordenadas manuales para fotos sin GPS en EXIF.
// ============================================================

import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common'
import { IFotoDronRepository } from '../../domain/repositories/foto-dron.repository'
import { IGeografiaRepository } from '../../domain/repositories/geografia.repository'
import { OrigenCoordenada } from '../../domain/entities/foto-dron.entity'
import { JwtPayload } from '../../../shared/types/jwt-payload.type'
import { RolUsuario } from '../../domain/entities/usuario.entity'

@Injectable()
export class AsignarCoordenadasManualesUseCase {
  constructor(
    @Inject(IFotoDronRepository)
    private readonly fotoDronRepository: IFotoDronRepository,
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
  ) {}

  async execute(id: string, lat: number, lon: number, user: JwtPayload) {
    const foto = await this.fotoDronRepository.findById(id)
    if (!foto) {
      throw new NotFoundException('Foto no encontrada')
    }

    if (user.rol === RolUsuario.OPERADOR && foto.operadorId !== user.sub) {
      throw new ForbiddenException('No puedes editar fotos de otros operadores')
    }

    foto.asignarCoordenadasManuales(lat, lon)
    const ubicacion = await this.geografiaRepository.resolverUbicacion(foto.latitud!, foto.longitud!)

    return this.fotoDronRepository.update(id, {
      latitud: foto.latitud,
      longitud: foto.longitud,
      esCoordenadasManual: true,
      origenCoordenada: OrigenCoordenada.MANUAL,
      provincia: ubicacion?.provincia ?? null,
      canton: ubicacion?.canton ?? null,
    })
  }
}

import { Injectable } from '@nestjs/common'
import { IFotoDronRepository } from '../../domain/repositories/foto-dron.repository'

@Injectable()
export class GetFiltrosUseCase {
  constructor(private fotoDronRepository: IFotoDronRepository) {}

  async execute() {
    const fotos = await this.fotoDronRepository.findAll()

    const provincias = this.extraerProvincias(fotos)
    const fechas = this.extraerFechas(fotos)
    const operadores = this.extraerOperadores(fotos)

    return { provincias, fechas, operadores }
  }

  private extraerProvincias(fotos: any[]): string[] {
    const provinciasCandidatas = new Set<string>()

    fotos.forEach(foto => {
      if (foto.provincia) provinciasCandidatas.add(foto.provincia)
    })

    return Array.from(provinciasCandidatas).sort()
  }

  private extraerFechas(fotos: any[]): string[] {
    const fechasSet = new Set<string>()
    fotos.forEach(foto => {
      const fecha = new Date(foto.fechaCaptura || foto.createdAt).toLocaleDateString('es-EC')
      fechasSet.add(fecha)
    })
    return Array.from(fechasSet).sort().reverse()
  }

  private extraerOperadores(fotos: any[]): string[] {
    const operadoresSet = new Set<string>()
    fotos.forEach(foto => {
      if (foto.operadorId) operadoresSet.add(foto.operadorId)
    })
    return Array.from(operadoresSet).sort()
  }
}

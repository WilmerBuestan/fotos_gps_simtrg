import { Injectable, Inject } from '@nestjs/common'
import {
  IFotoDronRepository,
  FiltroFotosHeatmapDto,
} from '../../domain/repositories/foto-dron.repository'

@Injectable()
export class GenerarHeatmapFotosUseCase {
  constructor(
    @Inject(IFotoDronRepository)
    private readonly fotoDronRepository: IFotoDronRepository,
  ) {}

  async execute(filtro?: FiltroFotosHeatmapDto) {
    return this.fotoDronRepository.generarHeatmap(filtro)
  }
}

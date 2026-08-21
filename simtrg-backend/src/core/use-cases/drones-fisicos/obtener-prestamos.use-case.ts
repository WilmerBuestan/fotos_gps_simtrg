// ============================================================
// CASO DE USO: ObtenerPrestamosDron
// Capa: Core > Use Cases > DronesFisicos
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import {
  IPrestamoDronRepository,
  FiltroPrestamosDto,
} from '../../domain/repositories/prestamo-dron.repository';

@Injectable()
export class ObtenerPrestamosDronUseCase {
  constructor(
    @Inject(IPrestamoDronRepository)
    private readonly prestamoRepo: IPrestamoDronRepository,
  ) {}

  async execute(filtro?: FiltroPrestamosDto) {
    return this.prestamoRepo.findAll(filtro);
  }
}

// ============================================================
// CASO DE USO: ObtenerMovimientosPendientes
// Capa: Core > Use Cases > DronesFisicos
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { IMovimientoPendienteRepository } from '../../domain/repositories/movimiento-pendiente.repository';

@Injectable()
export class ObtenerMovimientosPendientesUseCase {
  constructor(
    @Inject(IMovimientoPendienteRepository)
    private readonly pendienteRepo: IMovimientoPendienteRepository,
  ) {}

  async execute() {
    return this.pendienteRepo.findPendientes();
  }
}

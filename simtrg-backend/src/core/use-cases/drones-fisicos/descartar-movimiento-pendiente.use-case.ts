// ============================================================
// CASO DE USO: DescartarMovimientoPendiente
// Capa: Core > Use Cases > DronesFisicos
// Cierra un "movimiento_pendiente" sin generar ningún préstamo
// (para cuando fue un escaneo erróneo/duplicado).
// ============================================================

import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IMovimientoPendienteRepository } from '../../domain/repositories/movimiento-pendiente.repository';

@Injectable()
export class DescartarMovimientoPendienteUseCase {
  constructor(
    @Inject(IMovimientoPendienteRepository)
    private readonly pendienteRepo: IMovimientoPendienteRepository,
  ) {}

  async execute(pendienteId: string, actorId: string) {
    const pendiente = await this.pendienteRepo.findById(pendienteId);
    if (!pendiente) {
      throw new NotFoundException('Movimiento pendiente no encontrado.');
    }
    if (pendiente.resuelto) {
      throw new ConflictException('Este movimiento pendiente ya fue resuelto.');
    }
    return this.pendienteRepo.marcarResuelto(pendienteId, actorId, null);
  }
}

// ============================================================
// CASO DE USO: CompletarMovimientoPendiente
// Capa: Core > Use Cases > DronesFisicos
// Cierra un "movimiento_pendiente" (tarjeta perdida) una vez que
// el bodeguero elige desde la web el lado que faltaba.
// ============================================================

import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IMovimientoPendienteRepository } from '../../domain/repositories/movimiento-pendiente.repository';
import { TipoMovimientoPendiente } from '../../domain/entities/movimiento-pendiente.entity';
import { OrigenPrestamoDron } from '../../domain/entities/prestamo-dron.entity';
import { RegistrarMovimientoDronUseCase } from './registrar-movimiento.use-case';

export interface CompletarMovimientoPendienteInputDto {
  pendienteId: string;
  actorId: string;
  usuarioId?: string;
  dronId?: string;
}

@Injectable()
export class CompletarMovimientoPendienteUseCase {
  constructor(
    @Inject(IMovimientoPendienteRepository)
    private readonly pendienteRepo: IMovimientoPendienteRepository,
    private readonly registrarMovimientoUseCase: RegistrarMovimientoDronUseCase,
  ) {}

  async execute(input: CompletarMovimientoPendienteInputDto) {
    const pendiente = await this.pendienteRepo.findById(input.pendienteId);
    if (!pendiente) {
      throw new NotFoundException('Movimiento pendiente no encontrado.');
    }
    if (pendiente.resuelto) {
      throw new ConflictException('Este movimiento pendiente ya fue resuelto.');
    }

    const esFaltaUsuario = pendiente.tipo === TipoMovimientoPendiente.FALTA_USUARIO;
    if (esFaltaUsuario && !input.usuarioId) {
      throw new ConflictException('Debe indicar el usuario que faltaba.');
    }
    if (!esFaltaUsuario && !input.dronId) {
      throw new ConflictException('Debe indicar el dron que faltaba.');
    }

    const resultado = await this.registrarMovimientoUseCase.execute({
      dronId: esFaltaUsuario ? pendiente.dronId! : input.dronId,
      usuarioId: esFaltaUsuario ? input.usuarioId : pendiente.usuarioId!,
      origen: OrigenPrestamoDron.MANUAL,
      observaciones: 'Completado manualmente: tarjeta física no disponible.',
    });

    await this.pendienteRepo.marcarResuelto(
      pendiente.id,
      input.actorId,
      resultado.prestamoId ?? null,
    );

    return resultado;
  }
}

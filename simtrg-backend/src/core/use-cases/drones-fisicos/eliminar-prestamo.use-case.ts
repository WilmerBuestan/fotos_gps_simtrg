// ============================================================
// CASO DE USO: EliminarPrestamoDron
// Capa: Core > Use Cases > DronesFisicos
// Solo ADMINISTRADOR (ver controller). Permite corregir el
// historial (registros de prueba, duplicados, errores manuales).
// Si el préstamo eliminado estaba "en curso" (sin fecha de entrada),
// el dron se libera a DISPONIBLE — de lo contrario quedaría marcado
// como PRESTADO sin ningún préstamo abierto que lo respalde.
// ============================================================

import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IPrestamoDronRepository } from '../../domain/repositories/prestamo-dron.repository';
import { IDronFisicoRepository } from '../../domain/repositories/dron-fisico.repository';
import { EstadoDronFisico } from '../../domain/entities/dron-fisico.entity';

const CODIGO_POSTGRES_FK_VIOLATION = '23503';

@Injectable()
export class EliminarPrestamoDronUseCase {
  constructor(
    @Inject(IPrestamoDronRepository)
    private readonly prestamoRepo: IPrestamoDronRepository,
    @Inject(IDronFisicoRepository)
    private readonly dronRepo: IDronFisicoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const prestamo = await this.prestamoRepo.findById(id);
    if (!prestamo) {
      throw new NotFoundException('Registro de préstamo no encontrado.');
    }

    try {
      await this.prestamoRepo.delete(id);
    } catch (error: any) {
      const codigo = error?.code ?? error?.driverError?.code;
      if (codigo === CODIGO_POSTGRES_FK_VIOLATION) {
        throw new ConflictException(
          'No se puede eliminar: este préstamo quedó vinculado a un movimiento de "tarjeta perdida" ya resuelto.',
        );
      }
      throw error;
    }

    if (!prestamo.fechaEntrada) {
      const dron = await this.dronRepo.findById(prestamo.dronId);
      if (dron && dron.estado === EstadoDronFisico.PRESTADO) {
        await this.dronRepo.update(prestamo.dronId, { estado: EstadoDronFisico.DISPONIBLE });
      }
    }
  }
}

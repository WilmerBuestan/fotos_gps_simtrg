// ============================================================
// CASO DE USO: CompletarTareaMantenimiento
// Capa: Core > Use Cases > DronesFisicos
// ============================================================

import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { ITareaMantenimientoRepository } from '../../domain/repositories/tarea-mantenimiento.repository';
import { EstadoTarea } from '../../domain/entities/tarea-mantenimiento.entity';

@Injectable()
export class CompletarTareaMantenimientoUseCase {
  constructor(
    @Inject(ITareaMantenimientoRepository)
    private readonly tareaRepo: ITareaMantenimientoRepository,
  ) {}

  async execute(id: string) {
    const tarea = await this.tareaRepo.findById(id);
    if (!tarea) {
      throw new NotFoundException('Tarea de mantenimiento no encontrada.');
    }
    if (tarea.estado === EstadoTarea.COMPLETADA) {
      throw new ConflictException('Esta tarea ya está completada.');
    }
    return this.tareaRepo.completar(id);
  }
}

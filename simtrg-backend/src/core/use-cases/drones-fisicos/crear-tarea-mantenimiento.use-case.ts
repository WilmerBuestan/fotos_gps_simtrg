// ============================================================
// CASO DE USO: CrearTareaMantenimiento
// Capa: Core > Use Cases > DronesFisicos
// ============================================================

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITareaMantenimientoRepository } from '../../domain/repositories/tarea-mantenimiento.repository';
import { IDronFisicoRepository } from '../../domain/repositories/dron-fisico.repository';
import { PrioridadTarea } from '../../domain/entities/tarea-mantenimiento.entity';

export interface CrearTareaMantenimientoInputDto {
  dronId: string;
  descripcion: string;
  prioridad?: PrioridadTarea;
  tecnicoAsignado?: string | null;
  creadoPorId: string;
}

@Injectable()
export class CrearTareaMantenimientoUseCase {
  constructor(
    @Inject(ITareaMantenimientoRepository)
    private readonly tareaRepo: ITareaMantenimientoRepository,
    @Inject(IDronFisicoRepository)
    private readonly dronRepo: IDronFisicoRepository,
  ) {}

  async execute(input: CrearTareaMantenimientoInputDto) {
    const dron = await this.dronRepo.findById(input.dronId);
    if (!dron) {
      throw new NotFoundException('Dron no encontrado.');
    }
    return this.tareaRepo.create({
      dronId: input.dronId,
      descripcion: input.descripcion,
      prioridad: input.prioridad ?? PrioridadTarea.MEDIA,
      tecnicoAsignado: input.tecnicoAsignado,
      creadoPorId: input.creadoPorId,
    });
  }
}

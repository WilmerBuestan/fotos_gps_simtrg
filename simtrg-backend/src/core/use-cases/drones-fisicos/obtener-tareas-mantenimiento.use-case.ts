// ============================================================
// CASO DE USO: ObtenerTareasMantenimiento
// Capa: Core > Use Cases > DronesFisicos
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import {
  ITareaMantenimientoRepository,
  FiltroTareasMantenimientoDto,
} from '../../domain/repositories/tarea-mantenimiento.repository';

@Injectable()
export class ObtenerTareasMantenimientoUseCase {
  constructor(
    @Inject(ITareaMantenimientoRepository)
    private readonly tareaRepo: ITareaMantenimientoRepository,
  ) {}

  async execute(filtro?: FiltroTareasMantenimientoDto) {
    return this.tareaRepo.findAll(filtro);
  }
}

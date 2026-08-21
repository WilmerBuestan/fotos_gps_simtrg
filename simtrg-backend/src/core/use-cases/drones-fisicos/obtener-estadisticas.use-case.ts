// ============================================================
// CASO DE USO: ObtenerEstadisticasDrones
// Capa: Core > Use Cases > DronesFisicos
// Agrega en memoria (la flota es chica, no justifica SQL de
// agregación) los datos para el dashboard del bodeguero.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { IDronFisicoRepository } from '../../domain/repositories/dron-fisico.repository';
import { IPrestamoDronRepository } from '../../domain/repositories/prestamo-dron.repository';
import { EstadoDronFisico } from '../../domain/entities/dron-fisico.entity';

export interface ObtenerEstadisticasInputDto {
  desde?: Date;
  hasta?: Date;
}

const HORAS_ALERTA_PRESTAMO = 24;

@Injectable()
export class ObtenerEstadisticasDronesUseCase {
  constructor(
    @Inject(IDronFisicoRepository)
    private readonly dronRepo: IDronFisicoRepository,
    @Inject(IPrestamoDronRepository)
    private readonly prestamoRepo: IPrestamoDronRepository,
  ) {}

  async execute(input: ObtenerEstadisticasInputDto) {
    const [drones, prestamosEnRango, prestamosEnCurso] = await Promise.all([
      this.dronRepo.findAll(),
      this.prestamoRepo.findAll({ desde: input.desde, hasta: input.hasta }),
      this.prestamoRepo.findAll({ soloEnCurso: true }),
    ]);

    const porEstado = Object.values(EstadoDronFisico).map((estado) => ({
      estado,
      cantidad: drones.filter((d) => d.estado === estado).length,
    }));

    const porDiaMap = new Map<string, { salidas: number; entradas: number }>();
    for (const p of prestamosEnRango) {
      const diaSalida = p.fechaSalida.toISOString().slice(0, 10);
      const entradaSalida = porDiaMap.get(diaSalida) ?? { salidas: 0, entradas: 0 };
      entradaSalida.salidas += 1;
      porDiaMap.set(diaSalida, entradaSalida);

      if (p.fechaEntrada) {
        const diaEntrada = p.fechaEntrada.toISOString().slice(0, 10);
        const registro = porDiaMap.get(diaEntrada) ?? { salidas: 0, entradas: 0 };
        registro.entradas += 1;
        porDiaMap.set(diaEntrada, registro);
      }
    }
    const movimientosPorDia = Array.from(porDiaMap.entries())
      .map(([fecha, valores]) => ({ fecha, ...valores }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const usuariosCount = new Map<string, { nombre: string; cantidad: number }>();
    for (const p of prestamosEnRango) {
      if (p.usuarioSalidaNombre) {
        const actual = usuariosCount.get(p.usuarioSalidaId) ?? {
          nombre: p.usuarioSalidaNombre,
          cantidad: 0,
        };
        actual.cantidad += 1;
        usuariosCount.set(p.usuarioSalidaId, actual);
      }
    }
    const topUsuarios = Array.from(usuariosCount.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const ahora = Date.now();
    const atrasados = prestamosEnCurso.filter(
      (p) => (ahora - p.fechaSalida.getTime()) / (1000 * 60 * 60) > HORAS_ALERTA_PRESTAMO,
    ).length;

    return {
      porEstado,
      movimientosPorDia,
      topUsuarios,
      prestamosActivos: prestamosEnCurso.length,
      prestamosAtrasados: atrasados,
      movimientosEnRango: prestamosEnRango.length,
    };
  }
}

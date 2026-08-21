// ============================================================
// CASO DE USO: RegistrarMovimientoDron
// Capa: Core > Use Cases > DronesFisicos
// Punto único de la regla de negocio central del módulo: recibe
// la identificación de un usuario y un dron (por tarjeta RFID o
// por ID, según venga del ESP32 o del formulario manual) y decide
// automáticamente si es una SALIDA o una ENTRADA según el estado
// actual del dron. Tanto el endpoint del dispositivo como el
// manual llaman a este mismo caso de uso — una sola fuente de
// verdad para la lógica.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { IDronFisicoRepository } from '../../domain/repositories/dron-fisico.repository';
import { IPrestamoDronRepository } from '../../domain/repositories/prestamo-dron.repository';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import { IMovimientoPendienteRepository } from '../../domain/repositories/movimiento-pendiente.repository';
import { EstadoDronFisico } from '../../domain/entities/dron-fisico.entity';
import { OrigenPrestamoDron } from '../../domain/entities/prestamo-dron.entity';
import { TipoMovimientoPendiente } from '../../domain/entities/movimiento-pendiente.entity';

export interface RegistrarMovimientoInputDto {
  tagUsuario?: string;
  tagDron?: string;
  usuarioId?: string;
  dronId?: string;
  origen: OrigenPrestamoDron;
  observaciones?: string | null;
}

export interface RegistrarMovimientoOutputDto {
  ok: boolean;
  pendiente?: boolean;
  accion?: 'SALIDA' | 'ENTRADA';
  mensaje: string;
  dron?: { id: string; codigoInterno: string; estado: EstadoDronFisico };
  usuario?: { id: string; nombreCompleto: string };
  prestamoId?: string;
}

@Injectable()
export class RegistrarMovimientoDronUseCase {
  constructor(
    @Inject(IDronFisicoRepository)
    private readonly dronRepo: IDronFisicoRepository,
    @Inject(IPrestamoDronRepository)
    private readonly prestamoRepo: IPrestamoDronRepository,
    @Inject(IUsuarioRepository)
    private readonly usuarioRepo: IUsuarioRepository,
    @Inject(IMovimientoPendienteRepository)
    private readonly pendienteRepo: IMovimientoPendienteRepository,
  ) {}

  async execute(input: RegistrarMovimientoInputDto): Promise<RegistrarMovimientoOutputDto> {
    // Caso "tarjeta perdida": el ESP32 (con el botón de tag único) solo
    // mandó un lado. Se identifica ese lado y se deja un registro
    // pendiente para completar desde la web, sin tocar el estado del dron.
    const esCasoTagUnico =
      input.origen === OrigenPrestamoDron.ESP32 &&
      !input.usuarioId &&
      !input.dronId &&
      !(input.tagUsuario && input.tagDron) &&
      (!!input.tagUsuario || !!input.tagDron);
    if (esCasoTagUnico) {
      return this.registrarPendiente(input);
    }

    const usuario = input.usuarioId
      ? await this.usuarioRepo.findById(input.usuarioId)
      : input.tagUsuario
        ? await this.usuarioRepo.findByTagRfid(input.tagUsuario)
        : null;
    if (!usuario) {
      return { ok: false, mensaje: 'Tarjeta o usuario no reconocido.' };
    }
    if (!usuario.activo) {
      return { ok: false, mensaje: `Usuario ${usuario.nombreCompleto} está inactivo.` };
    }

    const dron = input.dronId
      ? await this.dronRepo.findById(input.dronId)
      : input.tagDron
        ? await this.dronRepo.findByTagRfid(input.tagDron)
        : null;
    if (!dron) {
      return { ok: false, mensaje: 'Tarjeta o dron no reconocido.' };
    }

    if (dron.estado === EstadoDronFisico.MANTENIMIENTO) {
      return { ok: false, mensaje: `El dron ${dron.codigoInterno} está en mantenimiento.` };
    }
    if (dron.estado === EstadoDronFisico.BAJA) {
      return { ok: false, mensaje: `El dron ${dron.codigoInterno} está dado de baja.` };
    }

    if (dron.estado === EstadoDronFisico.DISPONIBLE) {
      const prestamo = await this.prestamoRepo.create({
        dronId: dron.id,
        usuarioSalidaId: usuario.id,
        origen: input.origen,
        observaciones: input.observaciones,
      });
      await this.dronRepo.update(dron.id, { estado: EstadoDronFisico.PRESTADO });
      return {
        ok: true,
        accion: 'SALIDA',
        mensaje: `Salida registrada: ${dron.codigoInterno} → ${usuario.nombreCompleto}`,
        dron: { id: dron.id, codigoInterno: dron.codigoInterno, estado: EstadoDronFisico.PRESTADO },
        usuario: { id: usuario.id, nombreCompleto: usuario.nombreCompleto },
        prestamoId: prestamo.id,
      };
    }

    // dron.estado === PRESTADO → registrar entrada
    const prestamoEnCurso = await this.prestamoRepo.findPrestamoEnCurso(dron.id);
    if (!prestamoEnCurso) {
      return {
        ok: false,
        mensaje: `Inconsistencia: ${dron.codigoInterno} figura prestado sin préstamo abierto. Contacte al bodeguero.`,
      };
    }
    await this.prestamoRepo.registrarEntrada(prestamoEnCurso.id, usuario.id, input.observaciones);
    await this.dronRepo.update(dron.id, { estado: EstadoDronFisico.DISPONIBLE });
    return {
      ok: true,
      accion: 'ENTRADA',
      mensaje: `Entrada registrada: ${dron.codigoInterno} ← ${usuario.nombreCompleto}`,
      dron: { id: dron.id, codigoInterno: dron.codigoInterno, estado: EstadoDronFisico.DISPONIBLE },
      usuario: { id: usuario.id, nombreCompleto: usuario.nombreCompleto },
      prestamoId: prestamoEnCurso.id,
    };
  }

  private async registrarPendiente(
    input: RegistrarMovimientoInputDto,
  ): Promise<RegistrarMovimientoOutputDto> {
    if (input.tagDron) {
      const dron = await this.dronRepo.findByTagRfid(input.tagDron);
      if (!dron) {
        return { ok: false, mensaje: 'Tarjeta o dron no reconocido.' };
      }
      await this.pendienteRepo.create({
        tipo: TipoMovimientoPendiente.FALTA_USUARIO,
        dronId: dron.id,
        tagConocido: input.tagDron,
      });
      return {
        ok: true,
        pendiente: true,
        mensaje: `Dron ${dron.codigoInterno} identificado, falta la tarjeta del operador. Complete el registro desde el sistema.`,
        dron: { id: dron.id, codigoInterno: dron.codigoInterno, estado: dron.estado },
      };
    }

    const usuario = await this.usuarioRepo.findByTagRfid(input.tagUsuario!);
    if (!usuario) {
      return { ok: false, mensaje: 'Tarjeta o usuario no reconocido.' };
    }
    await this.pendienteRepo.create({
      tipo: TipoMovimientoPendiente.FALTA_DRON,
      usuarioId: usuario.id,
      tagConocido: input.tagUsuario!,
    });
    return {
      ok: true,
      pendiente: true,
      mensaje: `${usuario.nombreCompleto} identificado, falta la tarjeta del dron. Complete el registro desde el sistema.`,
      usuario: { id: usuario.id, nombreCompleto: usuario.nombreCompleto },
    };
  }
}

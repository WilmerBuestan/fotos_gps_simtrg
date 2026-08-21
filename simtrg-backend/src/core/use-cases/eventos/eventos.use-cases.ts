// ============================================================
// CASOS DE USO: Módulo B - Monitor Táctico
// ============================================================

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { ITipoActividadRepository } from '../../domain/repositories/eventos.repository';
import {
  IEventoTacticoRepository,
  CreateEventoTacticoDto,
  FiltroEventosDto,
} from '../../domain/repositories/eventos.repository';
import { IEventoFotoRepository } from '../../domain/repositories/evento-foto.repository';
import { IGeografiaRepository } from '../../domain/repositories/geografia.repository';
import { EventoFotoDomain } from '../../domain/entities/evento-foto.entity';
import { ThumbnailService } from '../../../infrastructure/services/thumbnail.service';
import {
  TipoActividadNoEncontradoException,
  TipoActividadYaExisteException,
  EventoNoEncontradoException,
  SinPermisosParaEliminarException,
  SinPermisosParaEditarException,
} from '../../domain/exceptions/eventos.exceptions';
import { RolUsuario } from '../../domain/entities/usuario.entity';
import { JwtPayload } from '../../../shared/types/jwt-payload.type';

export interface ArchivoEventoSubido {
  originalname: string;
  path: string;
  size: number;
}

// ---- TipoActividad ----

@Injectable()
export class GestionTiposActividadUseCase {
  constructor(
    @Inject(ITipoActividadRepository)
    private readonly repo: ITipoActividadRepository,
  ) {}

  async listar(soloActivos = true) {
    return this.repo.findAll(soloActivos);
  }

  async crear(nombre: string, descripcion?: string) {
    const existe = await this.repo.findByNombre(nombre);
    if (existe) throw new TipoActividadYaExisteException(nombre);
    return this.repo.create({ nombre, descripcion });
  }

  async toggleActivo(id: string) {
    const tipo = await this.repo.findById(id);
    if (!tipo) throw new TipoActividadNoEncontradoException(id);

    if (tipo.activo) {
      tipo.desactivar();
    } else {
      tipo.activar();
    }

    return this.repo.update(id, { activo: tipo.activo });
  }

  async actualizar(id: string, nombre?: string, descripcion?: string) {
    const tipo = await this.repo.findById(id);
    if (!tipo) throw new TipoActividadNoEncontradoException(id);

    if (nombre && nombre !== tipo.nombre) {
      const existe = await this.repo.findByNombre(nombre);
      if (existe) throw new TipoActividadYaExisteException(nombre);
    }

    return this.repo.update(id, { nombre, descripcion });
  }
}

// ---- EventoTactico ----

@Injectable()
export class RegistrarEventoUseCase {
  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly eventoRepo: IEventoTacticoRepository,
    @Inject(ITipoActividadRepository)
    private readonly tipoRepo: ITipoActividadRepository,
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
  ) {}

  async execute(data: CreateEventoTacticoDto) {
    const tipo = await this.tipoRepo.findById(data.tipoActividadId);
    if (!tipo || !tipo.activo) {
      throw new TipoActividadNoEncontradoException(data.tipoActividadId);
    }
    const ubicacion = await this.geografiaRepository.resolverUbicacion(data.latitud, data.longitud);
    return this.eventoRepo.create({
      ...data,
      provincia: ubicacion?.provincia ?? null,
      canton: ubicacion?.canton ?? null,
      parroquia: ubicacion?.parroquia ?? null,
    });
  }
}

@Injectable()
export class ActualizarEventoUseCase {
  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly eventoRepo: IEventoTacticoRepository,
    @Inject(ITipoActividadRepository)
    private readonly tipoRepo: ITipoActividadRepository,
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
  ) {}

  async execute(
    id: string,
    data: Partial<Omit<CreateEventoTacticoDto, 'operadorId'>>,
    user: JwtPayload,
  ) {
    const evento = await this.eventoRepo.findById(id);
    if (!evento) throw new EventoNoEncontradoException(id);

    if (user.rol === RolUsuario.OPERADOR && evento.operadorId !== user.sub) {
      throw new SinPermisosParaEditarException();
    }

    if (data.tipoActividadId) {
      const tipo = await this.tipoRepo.findById(data.tipoActividadId);
      if (!tipo || !tipo.activo) {
        throw new TipoActividadNoEncontradoException(data.tipoActividadId);
      }
    }

    if (data.latitud !== undefined && data.longitud !== undefined) {
      const ubicacion = await this.geografiaRepository.resolverUbicacion(data.latitud, data.longitud);
      data.provincia = ubicacion?.provincia ?? null;
      data.canton = ubicacion?.canton ?? null;
      data.parroquia = ubicacion?.parroquia ?? null;
    }

    return this.eventoRepo.update(id, data);
  }
}

@Injectable()
export class ObtenerEventosUseCase {
  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly repo: IEventoTacticoRepository,
    @Inject(IEventoFotoRepository)
    private readonly fotoRepo: IEventoFotoRepository,
  ) {}

  async findAll(user: JwtPayload, filtro?: FiltroEventosDto) {
    // Operador solo ve sus propios eventos
    if (user.rol === RolUsuario.OPERADOR) {
      return this.repo.findByOperador(user.sub);
    }
    return this.repo.findAll(filtro);
  }

  async findById(id: string) {
    const evento = await this.repo.findById(id);
    if (!evento) throw new EventoNoEncontradoException(id);
    evento.fotos = await this.fotoRepo.findByEvento(id);
    return evento;
  }
}

@Injectable()
export class EliminarEventoUseCase {
  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly repo: IEventoTacticoRepository,
  ) {}

  async execute(id: string, user: JwtPayload) {
    const evento = await this.repo.findById(id);
    if (!evento) throw new EventoNoEncontradoException(id);

    // Operador solo puede eliminar sus propios eventos
    if (
      user.rol === RolUsuario.OPERADOR &&
      evento.operadorId !== user.sub
    ) {
      throw new SinPermisosParaEliminarException();
    }

    await this.repo.delete(id);
  }
}

@Injectable()
export class GenerarHeatmapUseCase {
  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly repo: IEventoTacticoRepository,
  ) {}

  async execute(filtro?: FiltroEventosDto) {
    return this.repo.generarHeatmap(filtro);
  }
}

// ---- EventoFoto ----

async function verificarPropiedadEvento(
  eventoRepo: IEventoTacticoRepository,
  eventoId: string,
  user: JwtPayload,
) {
  const evento = await eventoRepo.findById(eventoId);
  if (!evento) throw new EventoNoEncontradoException(eventoId);

  if (user.rol === RolUsuario.OPERADOR && evento.operadorId !== user.sub) {
    throw new SinPermisosParaEditarException();
  }
  return evento;
}

@Injectable()
export class SubirFotosEventoUseCase {
  private readonly logger = new Logger(SubirFotosEventoUseCase.name);

  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly eventoRepo: IEventoTacticoRepository,
    @Inject(IEventoFotoRepository)
    private readonly fotoRepo: IEventoFotoRepository,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  async execute(
    eventoId: string,
    archivos: ArchivoEventoSubido[],
    user: JwtPayload,
  ) {
    await verificarPropiedadEvento(this.eventoRepo, eventoId, user);

    const fotos: EventoFotoDomain[] = [];
    for (const archivo of archivos) {
      try {
        const rutaMiniatura = await this.thumbnailService.generar(archivo.path);
        const foto = await this.fotoRepo.create({
          eventoTacticoId: eventoId,
          rutaArchivo: archivo.path,
          rutaMiniatura,
          nombreArchivo: archivo.originalname,
          tamanoBytes: archivo.size,
        });
        fotos.push(foto);
      } catch (error) {
        this.logger.error(
          `Error procesando foto de evento ${archivo.originalname}: ${error.message}`,
        );
      }
    }
    return fotos;
  }
}

@Injectable()
export class EliminarFotoEventoUseCase {
  constructor(
    @Inject(IEventoTacticoRepository)
    private readonly eventoRepo: IEventoTacticoRepository,
    @Inject(IEventoFotoRepository)
    private readonly fotoRepo: IEventoFotoRepository,
  ) {}

  async execute(eventoId: string, fotoId: string, user: JwtPayload) {
    await verificarPropiedadEvento(this.eventoRepo, eventoId, user);

    const foto = await this.fotoRepo.findById(fotoId);
    if (!foto || foto.eventoTacticoId !== eventoId) {
      throw new NotFoundException('Foto de evento no encontrada');
    }

    await this.fotoRepo.delete(fotoId);

    try {
      if (fs.existsSync(foto.rutaMiniatura)) fs.unlinkSync(foto.rutaMiniatura);
      if (fs.existsSync(foto.rutaArchivo)) fs.unlinkSync(foto.rutaArchivo);
    } catch {
      // Best-effort: no bloquear la eliminación por errores de filesystem
    }
  }
}

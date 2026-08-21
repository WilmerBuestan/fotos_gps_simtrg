// ============================================================
// CASO DE USO: Logout
// Capa: Core > Use Cases > Auth
// El JWT es stateless (no hay nada que invalidar); este caso de
// uso solo registra el evento de auditoría y actualiza la última
// ubicación conocida del usuario antes de que el frontend borre
// el token.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';
import { IGeografiaRepository } from '../../domain/repositories/geografia.repository';
import { RegistrarLogUseCase } from '../auditoria/registrar-log.use-case';
import { TipoEventoAuditoria } from '../../domain/entities/auditoria-log.entity';

export interface LogoutInputDto {
  usuarioId: string;
  username: string;
  rol: string;
  ip?: string;
  latitud?: number;
  longitud?: number;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
    private readonly registrarLogUseCase: RegistrarLogUseCase,
  ) {}

  async execute(input: LogoutInputDto): Promise<void> {
    let provincia: string | undefined;
    let canton: string | undefined;
    let parroquia: string | undefined;

    if (input.latitud != null && input.longitud != null) {
      const ubicacion = await this.geografiaRepository
        .resolverUbicacion(input.latitud, input.longitud)
        .catch(() => null);
      provincia = ubicacion?.provincia;
      canton = ubicacion?.canton;
      parroquia = ubicacion?.parroquia;

      await this.usuarioRepository.update(input.usuarioId, {
        ultimaUbicacionLat: input.latitud,
        ultimaUbicacionLon: input.longitud,
        ultimaUbicacionProvincia: provincia,
        ultimaUbicacionCanton: canton,
        ultimaUbicacionParroquia: parroquia,
        ultimaUbicacionFecha: new Date(),
      });
    }

    await this.registrarLogUseCase.execute({
      tipoEvento: TipoEventoAuditoria.LOGOUT,
      metodoHttp: 'POST',
      url: '/auth/logout',
      usuarioId: input.usuarioId,
      username: input.username,
      rol: input.rol,
      ip: input.ip ?? null,
      latitud: input.latitud ?? null,
      longitud: input.longitud ?? null,
      exitoso: true,
    });
  }
}

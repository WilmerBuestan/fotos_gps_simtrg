import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TipoActividadOrmEntity } from '../../database/entities/tipo-actividad.orm-entity';
import { EventoTacticoOrmEntity } from '../../database/entities/evento-tactico.orm-entity';
import { EventoFotoOrmEntity } from '../../database/entities/evento-foto.orm-entity';
import { UsuarioOrmEntity } from '../../database/entities/usuario.orm-entity';

import { ITipoActividadRepository } from '../../../core/domain/repositories/eventos.repository';
import { IEventoTacticoRepository } from '../../../core/domain/repositories/eventos.repository';
import { IEventoFotoRepository } from '../../../core/domain/repositories/evento-foto.repository';
import { IGeografiaRepository } from '../../../core/domain/repositories/geografia.repository';
import { TipoActividadRepositoryImpl } from '../../database/repositories/tipo-actividad.repository.impl';
import { EventoTacticoRepositoryImpl } from '../../database/repositories/evento-tactico.repository.impl';
import { EventoFotoRepositoryImpl } from '../../database/repositories/evento-foto.repository.impl';
import { GeografiaRepositoryImpl } from '../../database/repositories/geografia.repository.impl';

import {
  GestionTiposActividadUseCase,
  RegistrarEventoUseCase,
  ObtenerEventosUseCase,
  ActualizarEventoUseCase,
  EliminarEventoUseCase,
  GenerarHeatmapUseCase,
  SubirFotosEventoUseCase,
  EliminarFotoEventoUseCase,
} from '../../../core/use-cases/eventos/eventos.use-cases';
import { ThumbnailService } from '../../services/thumbnail.service';

import { TiposActividadController } from '../controllers/eventos/tipos-actividad.controller';
import { EventosTacticosController } from '../controllers/eventos/eventos-tacticos.controller';
import { TiposActividadSeeder } from '../../database/seeds/tipos-actividad.seed';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoActividadOrmEntity,
      EventoTacticoOrmEntity,
      EventoFotoOrmEntity,
      UsuarioOrmEntity,
    ]),
  ],
  controllers: [TiposActividadController, EventosTacticosController],
  providers: [
    { provide: ITipoActividadRepository, useClass: TipoActividadRepositoryImpl },
    { provide: IEventoTacticoRepository, useClass: EventoTacticoRepositoryImpl },
    { provide: IEventoFotoRepository, useClass: EventoFotoRepositoryImpl },
    { provide: IGeografiaRepository, useClass: GeografiaRepositoryImpl },
    GestionTiposActividadUseCase,
    RegistrarEventoUseCase,
    ObtenerEventosUseCase,
    ActualizarEventoUseCase,
    EliminarEventoUseCase,
    GenerarHeatmapUseCase,
    SubirFotosEventoUseCase,
    EliminarFotoEventoUseCase,
    ThumbnailService,
    TiposActividadSeeder,
  ],
})
export class EventosModule {}

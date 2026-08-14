import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { FotoDronOrmEntity } from '../../database/entities/foto-dron.orm-entity'
import { UsuarioOrmEntity } from '../../database/entities/usuario.orm-entity'
import { IFotoDronRepository } from '../../../core/domain/repositories/foto-dron.repository'
import { FotoDronRepositoryImpl } from '../../database/repositories/foto-dron.repository.impl'
import { IGeografiaRepository } from '../../../core/domain/repositories/geografia.repository'
import { GeografiaRepositoryImpl } from '../../database/repositories/geografia.repository.impl'
import { BulkUploadFotosUseCase } from '../../../core/use-cases/drones/bulk-upload-fotos.use-case'
import { ObtenerFotosUseCase } from '../../../core/use-cases/drones/obtener-fotos.use-case'
import { GetFiltrosUseCase } from '../../../core/use-cases/drones/get-filtros.use-case'
import { AsignarCoordenadasManualesUseCase } from '../../../core/use-cases/drones/asignar-coordenadas.use-case'
import { GenerarHeatmapFotosUseCase } from '../../../core/use-cases/drones/generar-heatmap-fotos.use-case'
import { ExifService } from '../../services/exif.service'
import { ThumbnailService } from '../../services/thumbnail.service'
import { DronesController } from '../controllers/drones/drones.controller'

@Module({
  imports: [TypeOrmModule.forFeature([FotoDronOrmEntity, UsuarioOrmEntity])],
  controllers: [DronesController],
  providers: [
    {
      provide: IFotoDronRepository,
      useClass: FotoDronRepositoryImpl,
    },
    { provide: IGeografiaRepository, useClass: GeografiaRepositoryImpl },
    BulkUploadFotosUseCase,
    ObtenerFotosUseCase,
    GetFiltrosUseCase,
    AsignarCoordenadasManualesUseCase,
    GenerarHeatmapFotosUseCase,
    ExifService,
    ThumbnailService,
  ],
})
export class DronesModule {}

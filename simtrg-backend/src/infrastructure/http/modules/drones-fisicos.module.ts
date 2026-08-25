import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DronFisicoOrmEntity } from '../../database/entities/dron-fisico.orm-entity';
import { PrestamoDronOrmEntity } from '../../database/entities/prestamo-dron.orm-entity';
import { MovimientoPendienteOrmEntity } from '../../database/entities/movimiento-pendiente.orm-entity';
import { TareaMantenimientoOrmEntity } from '../../database/entities/tarea-mantenimiento.orm-entity';
import { UsuarioOrmEntity } from '../../database/entities/usuario.orm-entity';

import { IDronFisicoRepository } from '../../../core/domain/repositories/dron-fisico.repository';
import { DronFisicoRepositoryImpl } from '../../database/repositories/dron-fisico.repository.impl';
import { IPrestamoDronRepository } from '../../../core/domain/repositories/prestamo-dron.repository';
import { PrestamoDronRepositoryImpl } from '../../database/repositories/prestamo-dron.repository.impl';
import { IMovimientoPendienteRepository } from '../../../core/domain/repositories/movimiento-pendiente.repository';
import { MovimientoPendienteRepositoryImpl } from '../../database/repositories/movimiento-pendiente.repository.impl';
import { ITareaMantenimientoRepository } from '../../../core/domain/repositories/tarea-mantenimiento.repository';
import { TareaMantenimientoRepositoryImpl } from '../../database/repositories/tarea-mantenimiento.repository.impl';
import { IUsuarioRepository } from '../../../core/domain/repositories/usuario.repository';
import { UsuarioRepositoryImpl } from '../../database/repositories/usuario.repository.impl';

import { GestionDronesFisicosUseCase } from '../../../core/use-cases/drones-fisicos/gestion-drones-fisicos.use-case';
import { RegistrarMovimientoDronUseCase } from '../../../core/use-cases/drones-fisicos/registrar-movimiento.use-case';
import { ObtenerPrestamosDronUseCase } from '../../../core/use-cases/drones-fisicos/obtener-prestamos.use-case';
import { ObtenerMovimientosPendientesUseCase } from '../../../core/use-cases/drones-fisicos/obtener-movimientos-pendientes.use-case';
import { CompletarMovimientoPendienteUseCase } from '../../../core/use-cases/drones-fisicos/completar-movimiento-pendiente.use-case';
import { DescartarMovimientoPendienteUseCase } from '../../../core/use-cases/drones-fisicos/descartar-movimiento-pendiente.use-case';
import { ObtenerEstadisticasDronesUseCase } from '../../../core/use-cases/drones-fisicos/obtener-estadisticas.use-case';
import { CrearTareaMantenimientoUseCase } from '../../../core/use-cases/drones-fisicos/crear-tarea-mantenimiento.use-case';
import { ObtenerTareasMantenimientoUseCase } from '../../../core/use-cases/drones-fisicos/obtener-tareas-mantenimiento.use-case';
import { CompletarTareaMantenimientoUseCase } from '../../../core/use-cases/drones-fisicos/completar-tarea-mantenimiento.use-case';

import { DronesFisicosController } from '../controllers/drones-fisicos/drones-fisicos.controller';
import { DeviceKeyGuard } from '../guards/device-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DronFisicoOrmEntity,
      PrestamoDronOrmEntity,
      MovimientoPendienteOrmEntity,
      TareaMantenimientoOrmEntity,
      UsuarioOrmEntity,
    ]),
  ],
  controllers: [DronesFisicosController],
  providers: [
    { provide: IDronFisicoRepository, useClass: DronFisicoRepositoryImpl },
    { provide: IPrestamoDronRepository, useClass: PrestamoDronRepositoryImpl },
    { provide: IMovimientoPendienteRepository, useClass: MovimientoPendienteRepositoryImpl },
    { provide: ITareaMantenimientoRepository, useClass: TareaMantenimientoRepositoryImpl },
    { provide: IUsuarioRepository, useClass: UsuarioRepositoryImpl },
    GestionDronesFisicosUseCase,
    RegistrarMovimientoDronUseCase,
    ObtenerPrestamosDronUseCase,
    ObtenerMovimientosPendientesUseCase,
    CompletarMovimientoPendienteUseCase,
    DescartarMovimientoPendienteUseCase,
    ObtenerEstadisticasDronesUseCase,
    CrearTareaMantenimientoUseCase,
    ObtenerTareasMantenimientoUseCase,
    CompletarTareaMantenimientoUseCase,
    DeviceKeyGuard,
  ],
})
export class DronesFisicosModule {}

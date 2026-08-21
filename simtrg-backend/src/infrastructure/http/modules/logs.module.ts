import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditoriaLogOrmEntity } from '../../database/entities/auditoria-log.orm-entity';
import { IAuditoriaLogRepository } from '../../../core/domain/repositories/auditoria-log.repository';
import { AuditoriaLogRepositoryImpl } from '../../database/repositories/auditoria-log.repository.impl';
import { IGeografiaRepository } from '../../../core/domain/repositories/geografia.repository';
import { GeografiaRepositoryImpl } from '../../database/repositories/geografia.repository.impl';
import { RegistrarLogUseCase } from '../../../core/use-cases/auditoria/registrar-log.use-case';
import { ObtenerLogsUseCase } from '../../../core/use-cases/auditoria/obtener-logs.use-case';
import { LogsController } from '../controllers/logs/logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaLogOrmEntity])],
  controllers: [LogsController],
  providers: [
    { provide: IAuditoriaLogRepository, useClass: AuditoriaLogRepositoryImpl },
    { provide: IGeografiaRepository, useClass: GeografiaRepositoryImpl },
    RegistrarLogUseCase,
    ObtenerLogsUseCase,
  ],
  // RegistrarLogUseCase lo consumen el interceptor global (AppModule) y AuthModule.
  exports: [RegistrarLogUseCase],
})
export class LogsModule {}

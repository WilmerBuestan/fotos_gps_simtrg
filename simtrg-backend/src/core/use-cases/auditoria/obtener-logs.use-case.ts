// ============================================================
// CASO DE USO: ObtenerLogs
// Capa: Core > Use Cases > Auditoria
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import {
  IAuditoriaLogRepository,
  FiltroLogsDto,
  LogsPaginados,
} from '../../domain/repositories/auditoria-log.repository';

@Injectable()
export class ObtenerLogsUseCase {
  constructor(
    @Inject(IAuditoriaLogRepository)
    private readonly auditoriaLogRepository: IAuditoriaLogRepository,
  ) {}

  async execute(filtro: FiltroLogsDto): Promise<LogsPaginados> {
    return this.auditoriaLogRepository.findAllPaginado(filtro);
  }
}

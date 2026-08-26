// ============================================================
// CONTROLLER: LogsController
// RBAC aplicado:
//   - GET /logs → solo ADMINISTRADOR
// ============================================================

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';
import { ObtenerLogsUseCase } from '../../../../core/use-cases/auditoria/obtener-logs.use-case';
import { ObtenerLogsQueryDto } from './logs.dto';

@ApiTags('Logs de Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly obtenerLogsUseCase: ObtenerLogsUseCase) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Listar logs de auditoría (paginado, filtrable)' })
  @ApiResponse({ status: 200, description: 'Página de logs de auditoría.' })
  async findAll(@Query() query: ObtenerLogsQueryDto) {
    // No hay ValidationPipe global en el proyecto, por lo que los
    // @Type(() => Number) del DTO no se aplican: page/limit llegan
    // como string desde el query string y se convierten aquí.
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Math.min(Number(query.limit), 200) : 50;
    return this.obtenerLogsUseCase.execute({
      tipoEvento: query.tipoEvento,
      fechaDesde: query.fechaDesde ? new Date(query.fechaDesde) : undefined,
      fechaHasta: query.fechaHasta ? new Date(query.fechaHasta) : undefined,
      page,
      limit,
    });
  }
}

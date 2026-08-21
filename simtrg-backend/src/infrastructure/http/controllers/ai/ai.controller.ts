// ============================================================
// CONTROLLER: AiController
// RBAC aplicado:
//   - POST /dashboard/analisis-ia → SUPERVISOR, ADMINISTRADOR
//     (mismo rol que UsuarioDomain.puedeAccederAlDashboardEstrategico())
// ============================================================

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UsuarioActual } from '../../decorators/usuario-actual.decorator';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';
import { GenerarAnalisisUseCase } from '../../../../core/use-cases/ai/generar-analisis.use-case';
import { AnalisisIaDto } from './ai.dto';
import { JwtPayload } from '../../../../shared/types/jwt-payload.type';

@ApiTags('Dashboard IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class AiController {
  constructor(private readonly generarAnalisisUseCase: GenerarAnalisisUseCase) {}

  @Post('analisis-ia')
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[SUPERVISOR+] Generar comentario de IA (Gemini) sobre un resumen del dashboard' })
  @ApiResponse({ status: 200, description: 'Comentario generado (o mensaje de respaldo si Gemini no está disponible).' })
  async generarAnalisis(@Body() dto: AnalisisIaDto, @UsuarioActual() user: JwtPayload) {
    return this.generarAnalisisUseCase.execute({
      tipo: dto.tipo,
      resumen: dto.resumen,
      fechaDesde: dto.fechaDesde,
      fechaHasta: dto.fechaHasta,
      usuarioId: user.sub,
    });
  }
}

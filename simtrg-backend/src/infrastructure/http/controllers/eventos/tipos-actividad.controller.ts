import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';
import { GestionTiposActividadUseCase } from '../../../../core/use-cases/eventos/eventos.use-cases';
import {
  CrearTipoActividadDto,
  ActualizarTipoActividadDto,
} from './eventos.dto';

@ApiTags('Catálogos - Tipos de Actividad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogos/tipos-actividad')
export class TiposActividadController {
  constructor(private readonly useCase: GestionTiposActividadUseCase) {}

  @Get()
  @Roles(RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar tipos de actividad activos' })
  async findAll(@Query('todos') todos?: string) {
    const soloActivos = todos !== 'true';
    return this.useCase.listar(soloActivos);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Crear nuevo tipo de actividad' })
  @ApiResponse({ status: 201, description: 'Tipo creado.' })
  @ApiResponse({ status: 409, description: 'Ya existe ese nombre.' })
  async crear(@Body() dto: CrearTipoActividadDto) {
    return this.useCase.crear(dto.nombre, dto.descripcion);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Actualizar tipo de actividad' })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarTipoActividadDto,
  ) {
    return this.useCase.actualizar(id, dto.nombre, dto.descripcion);
  }

  @Patch(':id/toggle')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Activar/Desactivar tipo (borrado lógico)' })
  async toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.useCase.toggleActivo(id);
  }
}

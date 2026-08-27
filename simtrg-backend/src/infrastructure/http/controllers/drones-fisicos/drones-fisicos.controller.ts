// ============================================================
// CONTROLLER: DronesFisicosController
// RBAC aplicado:
//   - POST /drones-fisicos/movimiento-dispositivo → clave de dispositivo (ESP32)
//   - Resto de rutas → ADMINISTRADOR, BODEGUERO
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { DeviceKeyGuard } from '../../guards/device-key.guard';
import { Roles } from '../../decorators/roles.decorator';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';
import { OrigenPrestamoDron } from '../../../../core/domain/entities/prestamo-dron.entity';
import { UsuarioActual } from '../../decorators/usuario-actual.decorator';
import { JwtPayload } from '../../../../shared/types/jwt-payload.type';
import { crearInterceptorFotoPerfil } from '../../utils/foto-perfil.interceptor';
import { GestionDronesFisicosUseCase } from '../../../../core/use-cases/drones-fisicos/gestion-drones-fisicos.use-case';
import { RegistrarMovimientoDronUseCase } from '../../../../core/use-cases/drones-fisicos/registrar-movimiento.use-case';
import { ObtenerPrestamosDronUseCase } from '../../../../core/use-cases/drones-fisicos/obtener-prestamos.use-case';
import { ObtenerMovimientosPendientesUseCase } from '../../../../core/use-cases/drones-fisicos/obtener-movimientos-pendientes.use-case';
import { CompletarMovimientoPendienteUseCase } from '../../../../core/use-cases/drones-fisicos/completar-movimiento-pendiente.use-case';
import { DescartarMovimientoPendienteUseCase } from '../../../../core/use-cases/drones-fisicos/descartar-movimiento-pendiente.use-case';
import { ObtenerEstadisticasDronesUseCase } from '../../../../core/use-cases/drones-fisicos/obtener-estadisticas.use-case';
import { CrearTareaMantenimientoUseCase } from '../../../../core/use-cases/drones-fisicos/crear-tarea-mantenimiento.use-case';
import { ObtenerTareasMantenimientoUseCase } from '../../../../core/use-cases/drones-fisicos/obtener-tareas-mantenimiento.use-case';
import { CompletarTareaMantenimientoUseCase } from '../../../../core/use-cases/drones-fisicos/completar-tarea-mantenimiento.use-case';
import { EliminarPrestamoDronUseCase } from '../../../../core/use-cases/drones-fisicos/eliminar-prestamo.use-case';
import {
  CrearDronFisicoDto,
  ActualizarDronFisicoDto,
  MovimientoDispositivoDto,
  MovimientoManualDto,
  FiltroPrestamosQueryDto,
  CompletarMovimientoPendienteDto,
  FiltroEstadisticasQueryDto,
  CrearTareaMantenimientoDto,
  FiltroTareasMantenimientoQueryDto,
} from './drones-fisicos.dto';

@ApiTags('Gestor de Drones')
@Controller('drones-fisicos')
export class DronesFisicosController {
  constructor(
    private readonly gestionUseCase: GestionDronesFisicosUseCase,
    private readonly registrarMovimientoUseCase: RegistrarMovimientoDronUseCase,
    private readonly obtenerPrestamosUseCase: ObtenerPrestamosDronUseCase,
    private readonly obtenerPendientesUseCase: ObtenerMovimientosPendientesUseCase,
    private readonly completarPendienteUseCase: CompletarMovimientoPendienteUseCase,
    private readonly descartarPendienteUseCase: DescartarMovimientoPendienteUseCase,
    private readonly obtenerEstadisticasUseCase: ObtenerEstadisticasDronesUseCase,
    private readonly crearTareaUseCase: CrearTareaMantenimientoUseCase,
    private readonly obtenerTareasUseCase: ObtenerTareasMantenimientoUseCase,
    private readonly completarTareaUseCase: CompletarTareaMantenimientoUseCase,
    private readonly eliminarPrestamoUseCase: EliminarPrestamoDronUseCase,
  ) {}

  @Post('movimiento-dispositivo')
  @UseGuards(DeviceKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Dispositivo ESP32] Registrar escaneo de tarjetas (salida/entrada automática, o solo una tarjeta con el botón de "tarjeta única")' })
  @ApiResponse({ status: 200, description: 'Siempre 200; revisar el campo "ok" del cuerpo.' })
  async movimientoDispositivo(@Body() dto: MovimientoDispositivoDto) {
    if (!dto.tagUsuario && !dto.tagDron) {
      return { ok: false, mensaje: 'Debe enviar al menos una tarjeta (tagUsuario o tagDron).' };
    }
    return this.registrarMovimientoUseCase.execute({
      tagUsuario: dto.tagUsuario,
      tagDron: dto.tagDron,
      origen: OrigenPrestamoDron.ESP32,
    });
  }

  @Get('movimientos-pendientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Listar movimientos pendientes de completar (tarjeta perdida)' })
  async movimientosPendientes() {
    return this.obtenerPendientesUseCase.execute();
  }

  @Post('movimientos-pendientes/:id/completar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Completar un movimiento pendiente eligiendo el lado que faltaba' })
  async completarPendiente(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletarMovimientoPendienteDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.completarPendienteUseCase.execute({
      pendienteId: id,
      actorId: user.sub,
      usuarioId: dto.usuarioId,
      dronId: dto.dronId,
    });
  }

  @Post('movimientos-pendientes/:id/descartar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Descartar un movimiento pendiente sin generar préstamo' })
  async descartarPendiente(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.descartarPendienteUseCase.execute(id, user.sub);
  }

  @Get('estadisticas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Estadísticas del dashboard (drones por estado, movimientos por día, top usuarios)' })
  async estadisticas(@Query() query: FiltroEstadisticasQueryDto) {
    return this.obtenerEstadisticasUseCase.execute({
      desde: query.desde ? new Date(query.desde) : undefined,
      hasta: query.hasta ? new Date(query.hasta) : undefined,
    });
  }

  @Post('movimiento')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Registrar movimiento manual desde la web (respaldo si el ESP32 falla)' })
  async movimientoManual(@Body() dto: MovimientoManualDto) {
    return this.registrarMovimientoUseCase.execute({
      dronId: dto.dronId,
      usuarioId: dto.usuarioId,
      origen: OrigenPrestamoDron.MANUAL,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Registrar un dron físico nuevo en el inventario' })
  async crear(@Body() dto: CrearDronFisicoDto) {
    return this.gestionUseCase.crear(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Listar el inventario de drones físicos' })
  async listar() {
    return this.gestionUseCase.listar();
  }

  @Get('prestamos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Historial de préstamos (filtrable por dron/usuario/fecha)' })
  async prestamos(@Query() query: FiltroPrestamosQueryDto) {
    return this.obtenerPrestamosUseCase.execute({
      dronId: query.dronId,
      usuarioId: query.usuarioId,
      desde: query.desde ? new Date(query.desde) : undefined,
      hasta: query.hasta ? new Date(query.hasta) : undefined,
    });
  }

  @Delete('prestamos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN] Eliminar un registro del historial de préstamos' })
  @ApiResponse({ status: 204, description: 'Registro eliminado.' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado.' })
  @ApiResponse({ status: 409, description: 'El préstamo está vinculado a un movimiento pendiente ya resuelto.' })
  async eliminarPrestamo(@Param('id', ParseUUIDPipe) id: string) {
    await this.eliminarPrestamoUseCase.execute(id);
  }

  @Post(':id/foto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Subir foto del dron' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { foto: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(crearInterceptorFotoPerfil('drones'))
  async subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.gestionUseCase.actualizar(id, { foto: archivo.path });
  }

  @Post(':id/tareas-mantenimiento')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Crear una tarea de mantenimiento para un dron' })
  async crearTarea(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearTareaMantenimientoDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.crearTareaUseCase.execute({
      dronId: id,
      descripcion: dto.descripcion,
      prioridad: dto.prioridad,
      tecnicoAsignado: dto.tecnicoAsignado,
      creadoPorId: user.sub,
    });
  }

  @Get('tareas-mantenimiento')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Listar tareas de mantenimiento (por defecto solo pendientes)' })
  async tareasMantenimiento(@Query() query: FiltroTareasMantenimientoQueryDto) {
    return this.obtenerTareasUseCase.execute({
      dronId: query.dronId,
      soloPendientes: String(query.incluirCompletadas) !== 'true',
    });
  }

  @Patch('tareas-mantenimiento/:id/completar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Marcar una tarea de mantenimiento como completada' })
  async completarTarea(@Param('id', ParseUUIDPipe) id: string) {
    return this.completarTareaUseCase.execute(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Editar un dron físico (datos, tag RFID, estado)' })
  async actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarDronFisicoDto) {
    return this.gestionUseCase.actualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Eliminar un dron físico del inventario' })
  @ApiResponse({ status: 204, description: 'Dron eliminado.' })
  @ApiResponse({ status: 404, description: 'Dron no encontrado.' })
  @ApiResponse({ status: 409, description: 'El dron tiene préstamos o tareas de mantenimiento asociadas.' })
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.gestionUseCase.eliminar(id);
  }
}

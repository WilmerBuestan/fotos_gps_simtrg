import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UsuarioActual } from '../../decorators/usuario-actual.decorator';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';
import {
  RegistrarEventoUseCase,
  ObtenerEventosUseCase,
  ActualizarEventoUseCase,
  EliminarEventoUseCase,
  GenerarHeatmapUseCase,
  SubirFotosEventoUseCase,
  EliminarFotoEventoUseCase,
} from '../../../../core/use-cases/eventos/eventos.use-cases';
import {
  CrearEventoTacticoDto,
  ActualizarEventoTacticoDto,
  FiltroEventosQueryDto,
} from './eventos.dto';
import { JwtPayload } from '../../../../shared/types/jwt-payload.type';

const UPLOAD_DIR = path.join(process.env.UPLOAD_PATH || '/app/uploads', 'eventos');
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_ARCHIVOS = 20;
const MAX_TAMANO_MB = 50;

@ApiTags('Módulo B - Monitor Táctico')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('eventos')
export class EventosTacticosController {
  constructor(
    private readonly registrarUseCase: RegistrarEventoUseCase,
    private readonly obtenerUseCase: ObtenerEventosUseCase,
    private readonly actualizarUseCase: ActualizarEventoUseCase,
    private readonly eliminarUseCase: EliminarEventoUseCase,
    private readonly heatmapUseCase: GenerarHeatmapUseCase,
    private readonly subirFotosUseCase: SubirFotosEventoUseCase,
    private readonly eliminarFotoUseCase: EliminarFotoEventoUseCase,
  ) {}

  @Post()
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Registrar nuevo evento táctico' })
  @ApiResponse({ status: 201, description: 'Evento registrado.' })
  async crear(
    @Body() dto: CrearEventoTacticoDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.registrarUseCase.execute({
      fechaHora: new Date(dto.fechaHora),
      latitud: dto.latitud,
      longitud: dto.longitud,
      tipoActividadId: dto.tipoActividadId,
      descripcionDetallada: dto.descripcionDetallada,
      operadorId: user.sub,
    });
  }

  @Get()
  @Roles(RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar eventos tácticos (RBAC aplicado)' })
  async findAll(
    @UsuarioActual() user: JwtPayload,
    @Query() filtro: FiltroEventosQueryDto,
  ) {
    return this.obtenerUseCase.findAll(user, {
      desde: filtro.desde ? new Date(filtro.desde) : undefined,
      hasta: filtro.hasta ? new Date(filtro.hasta) : undefined,
      tipoActividadId: filtro.tipoActividadId,
    });
  }

  @Get('heatmap')
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({
    summary: '[SUPERVISOR+] Datos de mapa de calor para el frontend',
    description:
      'Retorna puntos agrupados por celda geográfica con su densidad (peso). ' +
      'Compatible con Leaflet.heat y similares.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de puntos [{latitud, longitud, peso, tipoActividad}]',
  })
  async heatmap(@Query() filtro: FiltroEventosQueryDto) {
    return this.heatmapUseCase.execute({
      desde: filtro.desde ? new Date(filtro.desde) : undefined,
      hasta: filtro.hasta ? new Date(filtro.hasta) : undefined,
      tipoActividadId: filtro.tipoActividadId,
      provincia: filtro.provincia,
    });
  }

  @Get(':id')
  @Roles(RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener evento por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.obtenerUseCase.findById(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar evento táctico (Operador: solo los suyos)' })
  @ApiResponse({ status: 200, description: 'Evento actualizado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar.' })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEventoTacticoDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.actualizarUseCase.execute(
      id,
      {
        ...dto,
        fechaHora: dto.fechaHora ? new Date(dto.fechaHora) : undefined,
      },
      user,
    );
  }

  @Post(':id/fotos')
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Subir fotos adjuntas a un evento táctico' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fotos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('fotos', MAX_ARCHIVOS, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const safe = file.originalname
            .replace(ext, '')
            .replace(/[^a-zA-Z0-9-_]/g, '_');
          cb(null, `${timestamp}_${safe}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan JPG y PNG.`,
            ),
            false,
          );
        }
      },
      limits: { fileSize: MAX_TAMANO_MB * 1024 * 1024, files: MAX_ARCHIVOS },
    }),
  )
  async subirFotos(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() archivos: Express.Multer.File[],
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.subirFotosUseCase.execute(
      id,
      (archivos || []).map((f) => ({
        originalname: f.originalname,
        path: f.path,
        size: f.size,
      })),
      user,
    );
  }

  @Delete(':id/fotos/:fotoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar una foto adjunta de un evento táctico' })
  async eliminarFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
    @UsuarioActual() user: JwtPayload,
  ) {
    await this.eliminarFotoUseCase.execute(id, fotoId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar evento (Operador: solo los suyos)' })
  @ApiResponse({ status: 204, description: 'Evento eliminado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar.' })
  async eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() user: JwtPayload,
  ) {
    await this.eliminarUseCase.execute(id, user);
  }
}

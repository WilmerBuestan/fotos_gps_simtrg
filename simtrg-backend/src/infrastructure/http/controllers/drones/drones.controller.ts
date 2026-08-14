import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Param,
  Body,
  Query,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { diskStorage } from 'multer'
import * as path from 'path'
import * as fs from 'fs'
import { JwtAuthGuard } from '../../guards/jwt-auth.guard'
import { RolesGuard } from '../../guards/roles.guard'
import { Roles } from '../../decorators/roles.decorator'
import { UsuarioActual } from '../../decorators/usuario-actual.decorator'
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity'
import { BulkUploadFotosUseCase } from '../../../../core/use-cases/drones/bulk-upload-fotos.use-case'
import { ObtenerFotosUseCase } from '../../../../core/use-cases/drones/obtener-fotos.use-case'
import { GetFiltrosUseCase } from '../../../../core/use-cases/drones/get-filtros.use-case'
import { AsignarCoordenadasManualesUseCase } from '../../../../core/use-cases/drones/asignar-coordenadas.use-case'
import { GenerarHeatmapFotosUseCase } from '../../../../core/use-cases/drones/generar-heatmap-fotos.use-case'
import { AsignarCoordenadasDto, FiltroFotosHeatmapQueryDto } from './drones.dto'
import { JwtPayload } from '../../../../shared/types/jwt-payload.type'

const UPLOAD_DIR = process.env.UPLOAD_PATH || '/app/uploads'
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_ARCHIVOS = 50
const MAX_TAMANO_MB = 50

@ApiTags('Drones - Módulo A')
@Controller('drones')
export class DronesController {
  constructor(
    private readonly bulkUploadUseCase: BulkUploadFotosUseCase,
    private readonly obtenerFotosUseCase: ObtenerFotosUseCase,
    private readonly getFiltrosUseCase: GetFiltrosUseCase,
    private readonly asignarCoordenadasUseCase: AsignarCoordenadasManualesUseCase,
    private readonly generarHeatmapFotosUseCase: GenerarHeatmapFotosUseCase,
  ) {}

  @Get('filtros')
  @ApiOperation({ summary: 'Obtener filtros disponibles (sin autenticación)' })
  async getFiltros() {
    return this.getFiltrosUseCase.execute()
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Carga masiva de fotos de drones con extracción EXIF automática',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fotos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Resumen del procesamiento de fotos.' })
  @ApiResponse({ status: 400, description: 'No se enviaron archivos o tipo inválido.' })
  @UseInterceptors(
    FilesInterceptor('fotos', MAX_ARCHIVOS, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true })
          }
          cb(null, UPLOAD_DIR)
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now()
          const ext = path.extname(file.originalname)
          const safe = file.originalname
            .replace(ext, '')
            .replace(/[^a-zA-Z0-9-_]/g, '_')
          cb(null, `${timestamp}_${safe}${ext}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan JPG y PNG.`,
            ),
            false,
          )
        }
      },
      limits: {
        fileSize: MAX_TAMANO_MB * 1024 * 1024,
        files: MAX_ARCHIVOS,
      },
    }),
  )
  async bulkUpload(
    @UploadedFiles() archivos: Express.Multer.File[],
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.bulkUploadUseCase.execute(
      archivos.map((f) => ({
        originalname: f.originalname,
        filename: f.filename,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
      })),
      user.sub,
    )
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar fotos de drones (RBAC: Operador ve solo las suyas)' })
  @ApiResponse({ status: 200, description: 'Lista de fotos registradas.' })
  async findAll(@UsuarioActual() user: JwtPayload) {
    return this.obtenerFotosUseCase.findAll(user)
  }

  @Get('heatmap')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[SUPERVISOR+] Datos de mapa de calor de fotos para el frontend',
    description:
      'Retorna puntos agrupados por celda geográfica con su densidad (peso). ' +
      'Compatible con Leaflet.heat y similares.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de puntos [{latitud, longitud, peso}]',
  })
  async heatmap(@Query() filtro: FiltroFotosHeatmapQueryDto) {
    return this.generarHeatmapFotosUseCase.execute({
      desde: filtro.desde ? new Date(filtro.desde) : undefined,
      hasta: filtro.hasta ? new Date(filtro.hasta) : undefined,
      provincia: filtro.provincia,
    })
  }

  @Patch(':id/coordenadas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asignar coordenadas manuales a una foto sin GPS' })
  async asignarCoordenadas(
    @Param('id') id: string,
    @Body() dto: AsignarCoordenadasDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.asignarCoordenadasUseCase.execute(id, dto.latitud, dto.longitud, user)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.OPERADOR, RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una foto de dron' })
  async remove(@Param('id') id: string, @UsuarioActual() user: JwtPayload) {
    return this.obtenerFotosUseCase.deleteById(id, user)
  }
}

// ============================================================
// CONTROLLER: UsersController
// RBAC aplicado:
//   - GET /usuarios → SUPERVISOR, ADMINISTRADOR
//   - POST /usuarios → ADMINISTRADOR
//   - GET /usuarios/:id → SUPERVISOR, ADMINISTRADOR
//   - GET /usuarios/mi-perfil → Cualquier autenticado
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UsuarioActual } from '../../decorators/usuario-actual.decorator';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';
import { CrearUsuarioUseCase } from '../../../../core/use-cases/users/crear-usuario.use-case';
import { ObtenerUsuariosUseCase } from '../../../../core/use-cases/users/obtener-usuarios.use-case';
import { ActualizarUsuarioUseCase } from '../../../../core/use-cases/users/actualizar-usuario.use-case';
import { EliminarUsuarioUseCase } from '../../../../core/use-cases/users/eliminar-usuario.use-case';
import {
  CrearUsuarioDto,
  ActualizarUsuarioDto,
  ActualizarTagUsuarioDto,
  ActualizarMiPerfilDto,
} from './users.dto';
import { JwtPayload } from '../../../../shared/types/jwt-payload.type';
import { crearInterceptorFotoPerfil } from '../../utils/foto-perfil.interceptor';

const TODOS_LOS_ROLES = [
  RolUsuario.OPERADOR,
  RolUsuario.SUPERVISOR,
  RolUsuario.ADMINISTRADOR,
  RolUsuario.BODEGUERO,
];

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsersController {
  constructor(
    private readonly crearUsuarioUseCase: CrearUsuarioUseCase,
    private readonly obtenerUsuariosUseCase: ObtenerUsuariosUseCase,
    private readonly actualizarUsuarioUseCase: ActualizarUsuarioUseCase,
    private readonly eliminarUsuarioUseCase: EliminarUsuarioUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Crear nuevo usuario del sistema' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente.' })
  @ApiResponse({ status: 409, description: 'Username ya existe.' })
  @ApiResponse({ status: 403, description: 'Solo ADMINISTRADOR puede crear usuarios.' })
  async crear(@Body() dto: CrearUsuarioDto) {
    return this.crearUsuarioUseCase.execute({
      nombre: dto.nombre,
      apellido: dto.apellido,
      username: dto.username,
      password: dto.password,
      rol: dto.rol,
      tagRfid: dto.tagRfid,
    });
  }

  @Patch('mi-perfil')
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Editar mi propio perfil (nombre, apellido, grado, fecha de nacimiento, cédula, chapa)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.' })
  async actualizarMiPerfil(
    @Body() dto: ActualizarMiPerfilDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.actualizarUsuarioUseCase.execute({
      id: user.sub,
      actorId: user.sub,
      nombre: dto.nombre,
      apellido: dto.apellido,
      grado: dto.grado,
      fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
      cedula: dto.cedula,
      chapa: dto.chapa,
    });
  }

  @Post(':id/foto')
  @Roles(...TODOS_LOS_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subir foto de perfil (el propio usuario, o el ADMIN para cualquiera)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { foto: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(crearInterceptorFotoPerfil('usuarios'))
  async subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @UsuarioActual() user: JwtPayload,
  ) {
    if (user.sub !== id && user.rol !== RolUsuario.ADMINISTRADOR) {
      throw new ForbiddenException('Solo puedes subir tu propia foto de perfil (o ser ADMINISTRADOR).');
    }
    if (!archivo) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.actualizarUsuarioUseCase.execute({
      id,
      actorId: user.sub,
      foto: archivo.path,
    });
  }

  @Get()
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[SUPERVISOR+/BODEGUERO] Listar todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios.' })
  async findAll() {
    return this.obtenerUsuariosUseCase.findAll();
  }

  @Get('mi-perfil-completo')
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Obtener perfil completo del usuario actual' })
  async miPerfil(@UsuarioActual() user: JwtPayload) {
    return this.obtenerUsuariosUseCase.findById(user.sub);
  }

  @Get(':id')
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[SUPERVISOR+] Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Datos del usuario.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.obtenerUsuariosUseCase.findById(id);
  }

  @Patch(':id/tag-rfid')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.BODEGUERO)
  @ApiOperation({ summary: '[ADMIN/BODEGUERO] Asignar o quitar la tarjeta RFID de un usuario (Gestor de Drones)' })
  @ApiResponse({ status: 200, description: 'Tag RFID actualizado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  async actualizarTagRfid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarTagUsuarioDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.actualizarUsuarioUseCase.execute({
      id,
      actorId: user.sub,
      tagRfid: dto.tagRfid,
    });
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Editar usuario (datos, rol, estado o contraseña)' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiResponse({ status: 409, description: 'Debe quedar al menos un Administrador activo.' })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() user: JwtPayload,
  ) {
    return this.actualizarUsuarioUseCase.execute({
      id,
      actorId: user.sub,
      nombre: dto.nombre,
      apellido: dto.apellido,
      nuevaPassword: dto.nuevaPassword,
      rol: dto.rol,
      activo: dto.activo,
      tagRfid: dto.tagRfid,
      grado: dto.grado,
      fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
      cedula: dto.cedula,
      chapa: dto.chapa,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: '[ADMIN] Eliminar usuario permanentemente' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiResponse({
    status: 409,
    description: 'El usuario tiene fotos/eventos asociados, o es el último Administrador.',
  })
  async eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() user: JwtPayload,
  ) {
    await this.eliminarUsuarioUseCase.execute(id, user.sub);
  }
}

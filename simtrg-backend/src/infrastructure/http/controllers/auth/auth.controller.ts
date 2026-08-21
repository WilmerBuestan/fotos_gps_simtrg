import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginUseCase } from '../../../../core/use-cases/auth/login.use-case';
import { LogoutUseCase } from '../../../../core/use-cases/auth/logout.use-case';
import { LoginDto, LogoutDto } from './auth.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UsuarioActual } from '../../decorators/usuario-actual.decorator';
import { JwtPayload } from '../../../../shared/types/jwt-payload.type';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener token JWT' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna JWT.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({ status: 403, description: 'Cuenta desactivada.' })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.loginUseCase.execute({
      username: dto.username,
      password: dto.password,
      latitud: dto.latitud,
      longitud: dto.longitud,
      ip: req.ip,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión (registra el evento de auditoría)' })
  @ApiResponse({ status: 204, description: 'Logout registrado.' })
  async logout(@Body() dto: LogoutDto, @UsuarioActual() user: JwtPayload, @Req() req: any) {
    await this.logoutUseCase.execute({
      usuarioId: user.sub,
      username: user.username,
      rol: user.rol,
      ip: req.ip,
      latitud: dto.latitud,
      longitud: dto.longitud,
    });
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  getPerfil(@UsuarioActual() user: JwtPayload) {
    return {
      id: user.sub,
      username: user.username,
      rol: user.rol,
    };
  }
}

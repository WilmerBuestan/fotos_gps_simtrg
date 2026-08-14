import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginUseCase } from '../../../../core/use-cases/auth/login.use-case';
import { LoginDto } from './auth.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UsuarioActual } from '../../decorators/usuario-actual.decorator';
import { JwtPayload } from '../../../../shared/types/jwt-payload.type';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener token JWT' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna JWT.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({ status: 403, description: 'Cuenta desactivada.' })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute({
      username: dto.username,
      password: dto.password,
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

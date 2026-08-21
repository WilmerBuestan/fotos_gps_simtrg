import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '../../../../core/domain/entities/usuario.entity';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre del operador' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del operador' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido: string;

  @ApiProperty({ example: 'juan.perez', description: 'Username único (sin espacios)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'El username solo puede contener letras, números, puntos, guiones y guiones bajos.',
  })
  username: string;

  @ApiProperty({
    example: 'Clave@Segura123',
    description: 'Contraseña: mínimo 8 caracteres',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(100)
  password: string;

  @ApiProperty({
    enum: RolUsuario,
    example: RolUsuario.OPERADOR,
    description: 'Rol del usuario en el sistema',
  })
  @IsEnum(RolUsuario, {
    message: `El rol debe ser uno de: ${Object.values(RolUsuario).join(', ')}`,
  })
  rol: RolUsuario;

  @ApiPropertyOptional({ example: '04A3B2C1', description: 'UID de la tarjeta RFID personal (Gestor de Drones)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagRfid?: string;
}

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ example: 'NuevaClave@123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  nuevaPassword?: string;

  @ApiPropertyOptional({ enum: RolUsuario })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: '04A3B2C1', description: 'UID de la tarjeta RFID personal (Gestor de Drones)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagRfid?: string;
}

export class ActualizarTagUsuarioDto {
  @ApiPropertyOptional({
    example: '04A3B2C1',
    description: 'UID de la tarjeta RFID personal. Enviar null para quitar la tarjeta asignada.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagRfid?: string | null;
}

import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin.simtrg', description: 'Nombre de usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El username es obligatorio.' })
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'Clave@Segura123', description: 'Contraseña' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @ApiPropertyOptional({ example: -0.23, description: 'Latitud WGS84 (geolocalización del navegador)' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ example: -78.52, description: 'Longitud WGS84 (geolocalización del navegador)' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;
}

export class LogoutDto {
  @ApiPropertyOptional({ example: -0.23, description: 'Latitud WGS84 (geolocalización del navegador)' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ example: -78.52, description: 'Longitud WGS84 (geolocalización del navegador)' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;
}

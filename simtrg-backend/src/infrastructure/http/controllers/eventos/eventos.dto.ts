import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CrearTipoActividadDto {
  @ApiProperty({ example: 'GIA', description: 'Nombre del tipo de actividad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Grupos Ilegales Armados' })
  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class ActualizarTipoActividadDto {
  @ApiPropertyOptional({ example: 'GIA - Actualizado' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class CrearEventoTacticoDto {
  @ApiProperty({ example: '2026-08-13T15:00:00Z' })
  @IsDateString()
  fechaHora: string;

  @ApiProperty({ example: -0.23, description: 'Latitud WGS84' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitud: number;

  @ApiProperty({ example: -78.52, description: 'Longitud WGS84' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitud: number;

  @ApiProperty({ example: 'uuid-del-tipo-actividad' })
  @IsUUID()
  tipoActividadId: string;

  @ApiProperty({ example: 'Se observaron 3 individuos armados en el sector norte.' })
  @IsString()
  @IsNotEmpty()
  descripcionDetallada: string;
}

export class ActualizarEventoTacticoDto {
  @ApiPropertyOptional({ example: '2026-08-13T15:00:00Z' })
  @IsOptional()
  @IsDateString()
  fechaHora?: string;

  @ApiPropertyOptional({ example: -0.23, description: 'Latitud WGS84' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitud?: number;

  @ApiPropertyOptional({ example: -78.52, description: 'Longitud WGS84' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitud?: number;

  @ApiPropertyOptional({ example: 'uuid-del-tipo-actividad' })
  @IsOptional()
  @IsUUID()
  tipoActividadId?: string;

  @ApiPropertyOptional({ example: 'Se observaron 3 individuos armados en el sector norte.' })
  @IsOptional()
  @IsString()
  descripcionDetallada?: string;
}

export class FiltroEventosQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tipoActividadId?: string;

  @ApiPropertyOptional({ example: 'PICHINCHA' })
  @IsOptional()
  @IsString()
  provincia?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoDronFisico } from '../../../../core/domain/entities/dron-fisico.entity';

export class CrearDronFisicoDto {
  @ApiProperty({ example: 'DRN-001', description: 'Código interno único del dron' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigoInterno: string;

  @ApiProperty({ example: 'DJI Mavic 3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modelo: string;

  @ApiPropertyOptional({ example: 'DJI' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @ApiPropertyOptional({ example: '0B7F1A22', description: 'UID de la tarjeta RFID del dron' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagRfid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ActualizarDronFisicoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoInterno?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagRfid?: string;

  @ApiPropertyOptional({ enum: EstadoDronFisico })
  @IsOptional()
  @IsEnum(EstadoDronFisico)
  estado?: EstadoDronFisico;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class MovimientoDispositivoDto {
  @ApiPropertyOptional({
    example: '04A3B2C1',
    description:
      'UID de la tarjeta RFID del usuario. Con el botón de "tarjeta única" el ESP32 puede mandar solo este campo (sin tagDron).',
  })
  @IsOptional()
  @IsString()
  tagUsuario?: string;

  @ApiPropertyOptional({
    example: '0B7F1A22',
    description:
      'UID de la tarjeta RFID del dron. Con el botón de "tarjeta única" el ESP32 puede mandar solo este campo (sin tagUsuario).',
  })
  @IsOptional()
  @IsString()
  tagDron?: string;
}

export class MovimientoManualDto {
  @ApiProperty()
  @IsUUID()
  dronId: string;

  @ApiProperty()
  @IsUUID()
  usuarioId: string;
}

export class CompletarMovimientoPendienteDto {
  @ApiPropertyOptional({ description: 'Requerido si el pendiente es de tipo FALTA_USUARIO' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Requerido si el pendiente es de tipo FALTA_DRON' })
  @IsOptional()
  @IsUUID()
  dronId?: string;
}

export class FiltroEstadisticasQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}

export class FiltroPrestamosQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dronId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}

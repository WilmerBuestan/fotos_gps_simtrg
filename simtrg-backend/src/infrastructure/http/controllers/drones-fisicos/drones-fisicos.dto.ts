import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoDronFisico } from '../../../../core/domain/entities/dron-fisico.entity';
import { PrioridadTarea } from '../../../../core/domain/entities/tarea-mantenimiento.entity';

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

  @ApiProperty({ example: 'DJI' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @ApiProperty({ example: 'RTK v2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  version: string;

  @ApiPropertyOptional({ example: '0B7F1A22', description: 'UID de la tarjeta RFID del dron' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagRfid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  anioCompra?: number;
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
  @MaxLength(100)
  version?: string;

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

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  anioCompra?: number;

  @ApiPropertyOptional({ example: 128.5, description: 'Horas de vuelo acumuladas (vitácora manual)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  horasVuelo?: number;

  @ApiPropertyOptional({ example: 78, description: 'Porcentaje de batería del último reporte manual' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bateriaPorcentaje?: number;

  @ApiPropertyOptional({ example: 'Banco 3', description: 'Ubicación física dentro de la bodega' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ubicacionBodega?: string;
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

export class CrearTareaMantenimientoDto {
  @ApiProperty({ example: 'Reemplazo de motor delantero derecho' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ enum: PrioridadTarea, example: PrioridadTarea.MEDIA })
  @IsOptional()
  @IsEnum(PrioridadTarea)
  prioridad?: PrioridadTarea;

  @ApiPropertyOptional({ example: 'Sgto. Ramírez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tecnicoAsignado?: string;
}

export class FiltroTareasMantenimientoQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por dron' })
  @IsOptional()
  @IsUUID()
  dronId?: string;

  @ApiPropertyOptional({ description: 'Si es true, incluye también las completadas (por defecto solo pendientes)' })
  @IsOptional()
  @IsBoolean()
  incluirCompletadas?: boolean;
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

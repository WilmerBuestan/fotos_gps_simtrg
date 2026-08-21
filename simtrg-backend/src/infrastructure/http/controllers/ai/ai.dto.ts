import { IsIn, IsObject, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalisisIaDto {
  @ApiProperty({ enum: ['fotos', 'eventos'] })
  @IsIn(['fotos', 'eventos'])
  tipo: 'fotos' | 'eventos';

  @ApiProperty({ description: 'Resumen agregado (conteos por tipo/provincia/operador/fecha), no filas crudas' })
  @IsObject()
  resumen: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}

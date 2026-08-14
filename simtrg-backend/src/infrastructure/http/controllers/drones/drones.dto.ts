import { IsNumber, IsOptional, IsString, IsDateString, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class AsignarCoordenadasDto {
  @ApiProperty({ example: -0.23, description: 'Latitud WGS84' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitud: number

  @ApiProperty({ example: -78.52, description: 'Longitud WGS84' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitud: number
}

export class FiltroFotosHeatmapQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  desde?: string

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string

  @ApiPropertyOptional({ example: 'PICHINCHA' })
  @IsOptional()
  @IsString()
  provincia?: string
}

// ============================================================
// CASO DE USO: BulkUploadFotosUseCase
// Orquesta: recibir archivos → extraer EXIF → generar thumbnail
//           → persistir resultados
// ============================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import * as path from 'path';
import { IFotoDronRepository } from '../../domain/repositories/foto-dron.repository';
import { IGeografiaRepository } from '../../domain/repositories/geografia.repository';
import { ExifService } from '../../../infrastructure/services/exif.service';
import { ThumbnailService } from '../../../infrastructure/services/thumbnail.service';
import { OrigenCoordenada } from '../../domain/entities/foto-dron.entity';
import { CargaMasivaVaciaException } from '../../domain/exceptions/foto-dron.exceptions';

export interface ArchivoSubido {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface ResultadoCargaFoto {
  archivo: string;
  estado: 'exitoso' | 'sin_gps' | 'error';
  id?: string;
  latitud?: number;
  longitud?: number | null;
  fechaCaptura?: Date | null;
  rutaMiniatura?: string;
  mensaje?: string;
}

export interface BulkUploadOutputDto {
  total: number;
  exitosos: number;
  sinGps: number;
  errores: number;
  resultados: ResultadoCargaFoto[];
}

@Injectable()
export class BulkUploadFotosUseCase {
  private readonly logger = new Logger(BulkUploadFotosUseCase.name);

  constructor(
    @Inject(IFotoDronRepository)
    private readonly fotoDronRepository: IFotoDronRepository,
    @Inject(IGeografiaRepository)
    private readonly geografiaRepository: IGeografiaRepository,
    private readonly exifService: ExifService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  async execute(
    archivos: ArchivoSubido[],
    operadorId: string,
  ): Promise<BulkUploadOutputDto> {
    if (!archivos || archivos.length === 0) {
      throw new CargaMasivaVaciaException();
    }

    const resultados: ResultadoCargaFoto[] = [];

    for (const archivo of archivos) {
      try {
        this.logger.log(`Procesando: ${archivo.originalname}`);

        // 1. Extraer EXIF
        const exif = await this.exifService.extraer(archivo.path);

        // 2. Generar thumbnail
        const rutaMiniatura = await this.thumbnailService.generar(archivo.path);

        // 3. Determinar origen de coordenada
        const origenCoordenada =
          exif.latitud !== null ? OrigenCoordenada.GPS_EXIF : null;

        // 4. Resolver provincia/cantón si hay coordenadas
        const ubicacion =
          exif.latitud !== null && exif.longitud !== null
            ? await this.geografiaRepository.resolverUbicacion(exif.latitud, exif.longitud)
            : null;

        // 5. Persistir
        const fotoDron = await this.fotoDronRepository.create({
          rutaArchivo: archivo.path,
          rutaMiniatura,
          latitud: exif.latitud,
          longitud: exif.longitud,
          fechaCaptura: exif.fechaCaptura,
          esCoordenadasManual: false,
          origenCoordenada,
          operadorId,
          nombreArchivo: archivo.originalname,
          tamanoBytes: archivo.size,
          provincia: ubicacion?.provincia ?? null,
          canton: ubicacion?.canton ?? null,
          parroquia: ubicacion?.parroquia ?? null,
        });

        // 6. Clasificar resultado
        if (exif.latitud === null) {
          resultados.push({
            archivo: archivo.originalname,
            estado: 'sin_gps',
            id: fotoDron.id,
            rutaMiniatura,
            mensaje: 'Sin metadatos GPS. Se requiere asignación manual de coordenadas.',
          });
        } else {
          resultados.push({
            archivo: archivo.originalname,
            estado: 'exitoso',
            id: fotoDron.id,
            latitud: exif.latitud,
            longitud: exif.longitud,
            fechaCaptura: exif.fechaCaptura,
            rutaMiniatura,
          });
        }
      } catch (error) {
        this.logger.error(
          `Error procesando ${archivo.originalname}: ${error.message}`,
        );
        resultados.push({
          archivo: archivo.originalname,
          estado: 'error',
          mensaje: error.message,
        });
      }
    }

    return {
      total: resultados.length,
      exitosos: resultados.filter((r) => r.estado === 'exitoso').length,
      sinGps: resultados.filter((r) => r.estado === 'sin_gps').length,
      errores: resultados.filter((r) => r.estado === 'error').length,
      resultados,
    };
  }
}

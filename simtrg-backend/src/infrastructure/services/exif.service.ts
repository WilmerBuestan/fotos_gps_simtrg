// ============================================================
// SERVICIO: ExifService
// Extrae coordenadas GPS y fecha de captura de imágenes.
// Usa la librería 'exifr' (puro JS, sin dependencias nativas).
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import * as exifr from 'exifr';

export interface ExifData {
  latitud: number | null;
  longitud: number | null;
  fechaCaptura: Date | null;
}

@Injectable()
export class ExifService {
  private readonly logger = new Logger(ExifService.name);

  async extraer(rutaArchivo: string): Promise<ExifData> {
    try {
      // exifr.parse lee automáticamente todas las IFD disponibles.
      // Pedimos explícitamente GPSLatitudeRef/GPSLongitudeRef (N/S, E/W):
      // sin esa referencia, exifr no puede saber el signo real y asume
      // positivo (Norte/Este) por defecto, lo cual puede dar coordenadas
      // completamente erróneas (ej. en el hemisferio equivocado).
      const data = await exifr.parse(rutaArchivo, {
        pick: [
          'latitude',
          'longitude',
          'GPSLatitudeRef',
          'GPSLongitudeRef',
          'DateTimeOriginal',
          'CreateDate',
        ],
      });

      if (!data) {
        return { latitud: null, longitud: null, fechaCaptura: null };
      }

      const tieneReferenciaGps = !!data.GPSLatitudeRef && !!data.GPSLongitudeRef;
      const latitud = tieneReferenciaGps ? data.latitude ?? null : null;
      const longitud = tieneReferenciaGps ? data.longitude ?? null : null;
      const fechaCaptura = data.DateTimeOriginal ?? data.CreateDate ?? null;

      if (latitud !== null && longitud !== null) {
        this.logger.debug(
          `✅ GPS extraído: lat=${latitud}, lon=${longitud}`,
        );
      } else if (data.latitude !== undefined || data.longitude !== undefined) {
        this.logger.warn(
          `⚠️  GPS sin referencia N/S-E/W válida en EXIF, se descarta: ${rutaArchivo}`,
        );
      } else {
        this.logger.warn(`⚠️  Sin datos GPS en EXIF para: ${rutaArchivo}`);
      }

      return {
        latitud,
        longitud,
        fechaCaptura: fechaCaptura ? new Date(fechaCaptura) : null,
      };
    } catch (error) {
      this.logger.error(`Error extrayendo EXIF de ${rutaArchivo}: ${error.message}`);
      return { latitud: null, longitud: null, fechaCaptura: null };
    }
  }
}

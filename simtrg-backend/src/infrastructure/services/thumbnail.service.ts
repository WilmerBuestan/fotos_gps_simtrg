// ============================================================
// SERVICIO: ThumbnailService
// Genera miniaturas < 500KB para carga rápida en el mapa.
// Usa Sharp (puro JS en Alpine).
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

// Import con require para mejor compatibilidad en Alpine
const sharp = require('sharp');

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly MAX_WIDTH = 800;
  private readonly MAX_HEIGHT = 600;
  private readonly QUALITY = 75;

  async generar(rutaOriginal: string): Promise<string> {
    const dir = path.dirname(rutaOriginal);
    const ext = path.extname(rutaOriginal);
    const base = path.basename(rutaOriginal, ext);
    const rutaMiniatura = path.join(dir, 'thumbs', `${base}_thumb.jpg`);

    // Crear directorio de thumbnails si no existe
    const thumbDir = path.join(dir, 'thumbs');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    try {
      await sharp(rutaOriginal)
        .resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: this.QUALITY })
        .toFile(rutaMiniatura);

      const stats = fs.statSync(rutaMiniatura);
      this.logger.debug(
        `Thumbnail generado: ${rutaMiniatura} (${Math.round(stats.size / 1024)}KB)`,
      );
      return rutaMiniatura;
    } catch (error) {
      this.logger.error(`Error generando thumbnail: ${error.message}`);
      // Si falla el thumbnail, devuelve la ruta original
      return rutaOriginal;
    }
  }
}

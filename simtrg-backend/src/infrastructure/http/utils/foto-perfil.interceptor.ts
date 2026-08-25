// ============================================================
// UTILIDAD: interceptor de subida de foto de perfil (usuario o dron)
// Mismo patrón que drones.controller.ts (multer + diskStorage),
// pero para un solo archivo en el campo "foto".
// ============================================================

import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_PATH || '/app/uploads';
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_TAMANO_MB = 5;

export function crearInterceptorFotoPerfil(subcarpeta: string) {
  const destino = path.join(UPLOAD_DIR, subcarpeta);
  return FileInterceptor('foto', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        if (!fs.existsSync(destino)) {
          fs.mkdirSync(destino, { recursive: true });
        }
        cb(null, destino);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const safe = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${timestamp}_${safe}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan JPG y PNG.`,
          ),
          false,
        );
      }
    },
    limits: { fileSize: MAX_TAMANO_MB * 1024 * 1024 },
  });
}

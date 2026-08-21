// ============================================================
// SERVICIO: GeminiService
// Capa: Infrastructure > Services
// Llama a la API de Google Gemini (Google AI Studio, plan gratuito)
// usando fetch nativo de Node (no hay axios/@nestjs/axios en el
// backend, no hace falta agregar una dependencia para esto).
// Nunca debe lanzar: si Gemini falla o no hay cuota, devuelve un
// mensaje de respaldo para no romper el dashboard.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MENSAJE_NO_DISPONIBLE =
  'Análisis de IA no disponible en este momento (cuota alcanzada o servicio no configurado). Los datos, gráficos y tablas del reporte siguen siendo válidos.';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger('GeminiService');

  constructor(private readonly configService: ConfigService) {}

  async generarComentario(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY no configurada; se omite el análisis de IA.');
      return MENSAJE_NO_DISPONIBLE;
    }

    const model = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.5-flash-lite');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // El plan gratuito de Gemini responde ocasionalmente 503 ("sobrecargado")
    // bajo demanda alta; un reintento corto suele resolverlo sin que el
    // usuario note nada.
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          const cuerpo = await response.text();
          this.logger.warn(`Gemini respondió ${response.status} (intento ${intento}): ${cuerpo}`);
          if (response.status === 503 && intento < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          return MENSAJE_NO_DISPONIBLE;
        }

        const data = await response.json();
        const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return typeof texto === 'string' && texto.trim().length > 0 ? texto.trim() : MENSAJE_NO_DISPONIBLE;
      } catch (error) {
        this.logger.warn(`Error llamando a Gemini (intento ${intento}): ${(error as Error).message}`);
        if (intento < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        return MENSAJE_NO_DISPONIBLE;
      }
    }
    return MENSAJE_NO_DISPONIBLE;
  }
}

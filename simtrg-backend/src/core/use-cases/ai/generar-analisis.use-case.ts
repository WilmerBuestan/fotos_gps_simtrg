// ============================================================
// CASO DE USO: GenerarAnalisisIA
// Capa: Core > Use Cases > Ai
// Arma el prompt a partir de un resumen agregado (no de la tabla
// cruda) para no gastar cuota del plan gratuito de Gemini.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { GeminiService } from '../../../infrastructure/services/gemini.service';
import { IUsuarioRepository } from '../../domain/repositories/usuario.repository';

export interface GenerarAnalisisInputDto {
  tipo: 'fotos' | 'eventos';
  resumen: Record<string, unknown>;
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioId?: string;
}

// El primer "nombre" de estos usuarios en realidad guarda la abreviatura de
// su grado militar (ej. "Capt Sanchez", "Tnte Perez") — convención propia
// de la unidad. Se usa para que la IA se dirija al lector con el trato
// correcto ("mi capitán", "mi teniente", etc.), no como un nombre de pila.
const TRATAMIENTOS_POR_GRADO: Record<string, string> = {
  sld: 'mi soldado',
  sdo: 'mi soldado',
  cbo: 'mi cabo',
  cb: 'mi cabo',
  sgto: 'mi sargento',
  sgo: 'mi sargento',
  sgos: 'mi sargento',
  subt: 'mi subteniente',
  sub: 'mi subteniente',
  tnte: 'mi teniente',
  tte: 'mi teniente',
  capt: 'mi capitán',
  cap: 'mi capitán',
  my: 'mi mayor',
  may: 'mi mayor',
  tcrn: 'mi teniente coronel',
  tcnl: 'mi teniente coronel',
  crnl: 'mi coronel',
  cnel: 'mi coronel',
  gral: 'mi general',
  gen: 'mi general',
};

function resolverTratamiento(nombre?: string): string | null {
  if (!nombre) return null;
  const primeraPalabra = nombre.trim().split(/\s+/)[0]?.toLowerCase().replace(/\.$/, '');
  return TRATAMIENTOS_POR_GRADO[primeraPalabra] ?? null;
}

@Injectable()
export class GenerarAnalisisUseCase {
  constructor(
    private readonly geminiService: GeminiService,
    @Inject(IUsuarioRepository)
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async execute(input: GenerarAnalisisInputDto): Promise<{ comentario: string }> {
    const rango =
      input.fechaDesde || input.fechaHasta
        ? `entre ${input.fechaDesde ?? 'el inicio de los registros'} y ${input.fechaHasta ?? 'hoy'}`
        : 'sobre todo el histórico disponible';

    const sujeto = input.tipo === 'fotos' ? 'fotografías capturadas por drones' : 'eventos/incidentes tácticos';

    const usuario = input.usuarioId ? await this.usuarioRepository.findById(input.usuarioId) : null;
    const tratamiento = resolverTratamiento(usuario?.grado || usuario?.nombre);

    const prompt = [
      `Eres un analista de inteligencia técnica que apoya a una unidad militar (SIMTRG, 29 BIM - GMREE) a interpretar datos operacionales.`,
      tratamiento
        ? `Te diriges directamente a tu superior usando el trato militar respetuoso "${tratamiento}" (por ejemplo, iniciando con algo como "${tratamiento}, el análisis..."). Úsalo de forma natural una sola vez, no en cada oración.`
        : null,
      `A continuación tienes un resumen agregado (conteos, no datos individuales) de ${sujeto} ${rango}:`,
      JSON.stringify(input.resumen, null, 2),
      `Escribe un comentario breve (3 a 5 oraciones), en español, con tono profesional y técnico, que resuma los patrones más relevantes de estos datos (concentración geográfica, tendencia temporal, operadores más activos, u otros patrones útiles para la toma de decisiones). No inventes datos que no estén en el resumen. No repitas los números tal cual, interprétalos.`,
    ].filter(Boolean).join('\n\n');

    return { comentario: await this.geminiService.generarComentario(prompt) };
  }
}

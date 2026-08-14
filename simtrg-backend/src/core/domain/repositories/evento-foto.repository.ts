// ============================================================
// PUERTO: IEventoFotoRepository
// Capa: Core > Domain
// ============================================================

import { EventoFotoDomain } from '../entities/evento-foto.entity';

export interface CreateEventoFotoDto {
  eventoTacticoId: string;
  rutaArchivo: string;
  rutaMiniatura: string;
  nombreArchivo: string;
  tamanoBytes: number;
}

export abstract class IEventoFotoRepository {
  abstract create(data: CreateEventoFotoDto): Promise<EventoFotoDomain>;
  abstract findByEvento(eventoTacticoId: string): Promise<EventoFotoDomain[]>;
  abstract findById(id: string): Promise<EventoFotoDomain | null>;
  abstract delete(id: string): Promise<void>;
}

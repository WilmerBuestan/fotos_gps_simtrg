// ============================================================
// ADAPTADOR: EventoFotoRepositoryImpl
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IEventoFotoRepository,
  CreateEventoFotoDto,
} from '../../../core/domain/repositories/evento-foto.repository';
import { EventoFotoDomain } from '../../../core/domain/entities/evento-foto.entity';
import { EventoFotoOrmEntity } from '../entities/evento-foto.orm-entity';

@Injectable()
export class EventoFotoRepositoryImpl implements IEventoFotoRepository {
  constructor(
    @InjectRepository(EventoFotoOrmEntity)
    private readonly repo: Repository<EventoFotoOrmEntity>,
  ) {}

  private toDomain(orm: EventoFotoOrmEntity): EventoFotoDomain {
    return new EventoFotoDomain(
      orm.id,
      orm.eventoTacticoId,
      orm.rutaArchivo,
      orm.rutaMiniatura,
      orm.nombreArchivo,
      orm.tamanoBytes,
      orm.createdAt,
    );
  }

  async create(data: CreateEventoFotoDto): Promise<EventoFotoDomain> {
    const orm = this.repo.create({
      id: uuidv4(),
      eventoTacticoId: data.eventoTacticoId,
      rutaArchivo: data.rutaArchivo,
      rutaMiniatura: data.rutaMiniatura,
      nombreArchivo: data.nombreArchivo,
      tamanoBytes: data.tamanoBytes,
    });
    const saved = await this.repo.save(orm);
    return this.toDomain(saved);
  }

  async findByEvento(eventoTacticoId: string): Promise<EventoFotoDomain[]> {
    const orms = await this.repo.find({
      where: { eventoTacticoId },
      order: { createdAt: 'DESC' },
    });
    return orms.map((o) => this.toDomain(o));
  }

  async findById(id: string): Promise<EventoFotoDomain | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? this.toDomain(orm) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

// ============================================================
// CASO DE USO: GestionDronesFisicos
// Capa: Core > Use Cases > DronesFisicos
// CRUD del inventario (ADMINISTRADOR y BODEGUERO).
// ============================================================

import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import {
  IDronFisicoRepository,
  CreateDronFisicoDto,
  UpdateDronFisicoDto,
} from '../../domain/repositories/dron-fisico.repository';

@Injectable()
export class GestionDronesFisicosUseCase {
  constructor(
    @Inject(IDronFisicoRepository)
    private readonly dronRepo: IDronFisicoRepository,
  ) {}

  async crear(data: CreateDronFisicoDto) {
    const existente = await this.dronRepo.findByCodigoInterno(data.codigoInterno);
    if (existente) {
      throw new ConflictException(`Ya existe un dron con código ${data.codigoInterno}.`);
    }
    if (data.tagRfid) {
      const conTag = await this.dronRepo.findByTagRfid(data.tagRfid);
      if (conTag) {
        throw new ConflictException('Esa tarjeta RFID ya está asignada a otro dron.');
      }
    }
    return this.dronRepo.create(data);
  }

  async listar() {
    return this.dronRepo.findAll();
  }

  async actualizar(id: string, data: UpdateDronFisicoDto) {
    const dron = await this.dronRepo.findById(id);
    if (!dron) {
      throw new NotFoundException('Dron no encontrado.');
    }
    if (data.codigoInterno && data.codigoInterno !== dron.codigoInterno) {
      const conCodigo = await this.dronRepo.findByCodigoInterno(data.codigoInterno);
      if (conCodigo) {
        throw new ConflictException(`Ya existe un dron con código ${data.codigoInterno}.`);
      }
    }
    if (data.tagRfid) {
      const conTag = await this.dronRepo.findByTagRfid(data.tagRfid);
      if (conTag && conTag.id !== id) {
        throw new ConflictException('Esa tarjeta RFID ya está asignada a otro dron.');
      }
    }
    return this.dronRepo.update(id, data);
  }
}

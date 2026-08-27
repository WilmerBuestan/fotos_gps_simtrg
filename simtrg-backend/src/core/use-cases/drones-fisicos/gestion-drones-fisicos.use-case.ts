// ============================================================
// CASO DE USO: GestionDronesFisicos
// Capa: Core > Use Cases > DronesFisicos
// CRUD del inventario (ADMINISTRADOR y BODEGUERO).
// ============================================================

import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IDronFisicoRepository,
  CreateDronFisicoDto,
  UpdateDronFisicoDto,
} from '../../domain/repositories/dron-fisico.repository';

const CODIGO_POSTGRES_FK_VIOLATION = '23503';

@Injectable()
export class GestionDronesFisicosUseCase {
  constructor(
    @Inject(IDronFisicoRepository)
    private readonly dronRepo: IDronFisicoRepository,
  ) {}

  async crear(data: CreateDronFisicoDto) {
    if (!data.marca?.trim() || !data.version?.trim()) {
      throw new BadRequestException('Marca y versión son obligatorias para registrar un dron.');
    }
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

  async eliminar(id: string): Promise<void> {
    const dron = await this.dronRepo.findById(id);
    if (!dron) {
      throw new NotFoundException('Dron no encontrado.');
    }
    try {
      await this.dronRepo.delete(id);
    } catch (error: any) {
      const codigo = error?.code ?? error?.driverError?.code;
      if (codigo === CODIGO_POSTGRES_FK_VIOLATION) {
        throw new ConflictException(
          `No se puede eliminar ${dron.codigoInterno}: tiene préstamos o tareas de mantenimiento asociadas. Márcalo como "Baja" en su lugar para conservar el historial.`,
        );
      }
      throw error;
    }
  }
}

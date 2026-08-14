import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TipoActividadOrmEntity } from '../entities/tipo-actividad.orm-entity';

const TIPOS_INICIALES = [
  { nombre: 'GIA', descripcion: 'Grupos Ilegales Armados' },
  { nombre: 'Minería Ilegal', descripcion: 'Actividades de minería ilegal' },
  { nombre: 'Pasos Fronterizos', descripcion: 'Actividad sospechosa en pasos fronterizos' },
  { nombre: 'Pistas Clandestinas', descripcion: 'Pistas de aterrizaje no autorizadas' },
  { nombre: 'Hallazgo de Armamento/Caletas', descripcion: 'Descubrimiento de armas o depósitos' },
  { nombre: 'Distribución/Producción de Droga', descripcion: 'Actividad de narcotráfico' },
  { nombre: 'Seguridad PMI', descripcion: 'Protección de instalaciones militares' },
  { nombre: 'Búsqueda y Rescate', descripcion: 'Operaciones SAR' },
  { nombre: 'Tráfico de Combustible', descripcion: 'Contrabando de combustible' },
];

@Injectable()
export class TiposActividadSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('TiposActividadSeeder');

  constructor(
    @InjectRepository(TipoActividadOrmEntity)
    private readonly repo: Repository<TipoActividadOrmEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.repo.count();
    if (count > 0) {
      this.logger.log(`✅ Tipos de actividad ya existen (${count}), seeder omitido.`);
      return;
    }

    for (const tipo of TIPOS_INICIALES) {
      await this.repo.save({
        id: uuidv4(),
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        activo: true,
      });
    }

    this.logger.log(`🌱 ${TIPOS_INICIALES.length} tipos de actividad creados.`);
  }
}

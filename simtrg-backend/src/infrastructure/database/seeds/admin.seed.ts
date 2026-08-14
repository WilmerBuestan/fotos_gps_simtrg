// ============================================================
// SEEDER: AdminSeeder
// Crea el usuario ADMINISTRADOR inicial si no existe.
// Se ejecuta automáticamente al arrancar la aplicación.
// ============================================================

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcryptjs from 'bcryptjs';

import { UsuarioOrmEntity } from '../entities/usuario.orm-entity';
import { RolUsuario } from '../../../core/domain/entities/usuario.entity';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('AdminSeeder');

  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repo: Repository<UsuarioOrmEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existe = await this.repo.findOne({
      where: { username: 'admin.simtrg' },
    });

    if (existe) {
      this.logger.log('✅ Usuario admin ya existe, seeder omitido.');
      return;
    }

    const passwordHash = await bcryptjs.hash('Admin@Simtrg2024', 12);

    await this.repo.save({
      nombre: 'Administrador',
      apellido: 'SIMTRG',
      username: 'admin.simtrg',
      passwordHash,
      rol: RolUsuario.ADMINISTRADOR,
      activo: true,
    });

    this.logger.log('🌱 Usuario admin.simtrg creado por seeder.');
    this.logger.warn('⚠️  Cambia la contraseña del admin inmediatamente.');
  }
}
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { UsuarioOrmEntity } from '../database/entities/usuario.orm-entity';
import { AuditoriaLogOrmEntity } from '../database/entities/auditoria-log.orm-entity';
// NOTA: este array de entities ya estaba incompleto antes de este cambio
// (solo listaba UsuarioOrmEntity, sin FotoDronOrmEntity/EventoTacticoOrmEntity/etc.).
// Se agrega AuditoriaLogOrmEntity para que `migration:generate` la detecte,
// pero no se reconcilia el resto del array — no es parte de este alcance.

dotenv.config();

// Esta instancia se usa para los scripts de migración CLI
const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'simtrg_user'),
  password: configService.get('DB_PASSWORD', 'simtrg_secret_password'),
  database: configService.get('DB_DATABASE', 'simtrg_db'),
  entities: [UsuarioOrmEntity, AuditoriaLogOrmEntity],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize: false, // NUNCA true en producción
  logging: configService.get('NODE_ENV') === 'development',
});

import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { UsuarioOrmEntity } from '../database/entities/usuario.orm-entity';

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
  entities: [UsuarioOrmEntity],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize: false, // NUNCA true en producción
  logging: configService.get('NODE_ENV') === 'development',
});

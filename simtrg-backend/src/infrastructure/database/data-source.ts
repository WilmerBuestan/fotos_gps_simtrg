import { DataSource } from 'typeorm'
import { FotoDronOrmEntity } from './entities/foto-dron.orm-entity'
import { UsuarioOrmEntity } from './entities/usuario.orm-entity'
import { EventoTacticoOrmEntity } from './entities/evento-tactico.orm-entity'
import { TipoActividadOrmEntity } from './entities/tipo-actividad.orm-entity'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'simtrg_postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'simtrg_user',
  password: process.env.DB_PASSWORD || 'simtrg_pass',
  database: process.env.DB_NAME || 'simtrg_db',
  entities: [FotoDronOrmEntity, UsuarioOrmEntity, EventoTacticoOrmEntity, TipoActividadOrmEntity],
  synchronize: true,
  logging: false,
})

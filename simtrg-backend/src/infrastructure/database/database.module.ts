import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsuarioOrmEntity } from './entities/usuario.orm-entity';
import { FotoDronOrmEntity } from './entities/foto-dron.orm-entity';
import { TipoActividadOrmEntity } from './entities/tipo-actividad.orm-entity';
import { EventoTacticoOrmEntity } from './entities/evento-tactico.orm-entity';
import { EventoFotoOrmEntity } from './entities/evento-foto.orm-entity';
import { AuditoriaLogOrmEntity } from './entities/auditoria-log.orm-entity';
import { DronFisicoOrmEntity } from './entities/dron-fisico.orm-entity';
import { PrestamoDronOrmEntity } from './entities/prestamo-dron.orm-entity';
import { MovimientoPendienteOrmEntity } from './entities/movimiento-pendiente.orm-entity';
import { AdminSeeder } from './seeds/admin.seed';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [
          UsuarioOrmEntity,
          FotoDronOrmEntity,
          TipoActividadOrmEntity,
          EventoTacticoOrmEntity,
          EventoFotoOrmEntity,
          AuditoriaLogOrmEntity,
          DronFisicoOrmEntity,
          PrestamoDronOrmEntity,
          MovimientoPendienteOrmEntity,
        ],
        migrations: ['dist/infrastructure/database/migrations/*.js'],
        migrationsRun: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        ssl: false,
      }),
    }),
    TypeOrmModule.forFeature([
      UsuarioOrmEntity,
      FotoDronOrmEntity,
      TipoActividadOrmEntity,
      EventoTacticoOrmEntity,
    ]),
  ],
  providers: [AdminSeeder],
  exports: [AdminSeeder],
})
export class DatabaseModule {}

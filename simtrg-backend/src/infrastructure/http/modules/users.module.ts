import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuarioOrmEntity } from '../../database/entities/usuario.orm-entity';
import { IUsuarioRepository } from '../../../core/domain/repositories/usuario.repository';
import { UsuarioRepositoryImpl } from '../../database/repositories/usuario.repository.impl';
import { CrearUsuarioUseCase } from '../../../core/use-cases/users/crear-usuario.use-case';
import { ObtenerUsuariosUseCase } from '../../../core/use-cases/users/obtener-usuarios.use-case';
import { UsersController } from '../controllers/users/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioOrmEntity])],
  controllers: [UsersController],
  providers: [
    {
      provide: IUsuarioRepository,
      useClass: UsuarioRepositoryImpl,
    },
    CrearUsuarioUseCase,
    ObtenerUsuariosUseCase,
  ],
})
export class UsersModule {}

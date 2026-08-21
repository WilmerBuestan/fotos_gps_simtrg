import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entity
import { UsuarioOrmEntity } from '../../database/entities/usuario.orm-entity';

// Repositorio: Puerto → Adaptador
import { IUsuarioRepository } from '../../../core/domain/repositories/usuario.repository';
import { UsuarioRepositoryImpl } from '../../database/repositories/usuario.repository.impl';
import { IGeografiaRepository } from '../../../core/domain/repositories/geografia.repository';
import { GeografiaRepositoryImpl } from '../../database/repositories/geografia.repository.impl';

// Casos de uso
import { LoginUseCase } from '../../../core/use-cases/auth/login.use-case';
import { LogoutUseCase } from '../../../core/use-cases/auth/logout.use-case';

// HTTP
import { JwtStrategy } from '../guards/jwt.strategy';
import { AuthController } from '../controllers/auth/auth.controller';
import { LogsModule } from './logs.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION', '8h'),
        },
      }),
    }),
    TypeOrmModule.forFeature([UsuarioOrmEntity]),
    LogsModule,
  ],
  controllers: [AuthController],
  providers: [
    // Enlace Puerto → Adaptador (Inversión de Dependencia)
    {
      provide: IUsuarioRepository,
      useClass: UsuarioRepositoryImpl,
    },
    { provide: IGeografiaRepository, useClass: GeografiaRepositoryImpl },
    LoginUseCase,
    LogoutUseCase,
    JwtStrategy,
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}

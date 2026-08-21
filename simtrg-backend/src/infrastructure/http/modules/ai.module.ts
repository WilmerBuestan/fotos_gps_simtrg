import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioOrmEntity } from '../../database/entities/usuario.orm-entity';
import { IUsuarioRepository } from '../../../core/domain/repositories/usuario.repository';
import { UsuarioRepositoryImpl } from '../../database/repositories/usuario.repository.impl';
import { GeminiService } from '../../services/gemini.service';
import { GenerarAnalisisUseCase } from '../../../core/use-cases/ai/generar-analisis.use-case';
import { AiController } from '../controllers/ai/ai.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioOrmEntity])],
  controllers: [AiController],
  providers: [
    GeminiService,
    GenerarAnalisisUseCase,
    { provide: IUsuarioRepository, useClass: UsuarioRepositoryImpl },
  ],
})
export class AiModule {}

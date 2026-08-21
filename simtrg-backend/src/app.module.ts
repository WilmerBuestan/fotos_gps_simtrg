import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './infrastructure/http/modules/auth.module';
import { UsersModule } from './infrastructure/http/modules/users.module';
import { DronesModule } from './infrastructure/http/modules/drones.module';
import { EventosModule } from './infrastructure/http/modules/eventos.module';
import { LogsModule } from './infrastructure/http/modules/logs.module';
import { AiModule } from './infrastructure/http/modules/ai.module';
import { DronesFisicosModule } from './infrastructure/http/modules/drones-fisicos.module';
import { AuditoriaInterceptor } from './infrastructure/http/interceptors/auditoria.interceptor';
import { DomainExceptionFilter } from './infrastructure/http/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DronesModule,
    EventosModule,
    LogsModule,
    AiModule,
    DronesFisicosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}

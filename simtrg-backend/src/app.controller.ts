import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Salud')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Chequeo de salud del backend (usado por el healthcheck de Docker)' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

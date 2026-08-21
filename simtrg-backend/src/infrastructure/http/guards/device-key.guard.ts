// ============================================================
// GUARD: DeviceKeyGuard
// Autenticación para dispositivos IoT (ESP32) que no pueden hacer
// login interactivo: una clave fija compartida en un header, en
// vez de JWT. Mismo espíritu que GEMINI_API_KEY — un secreto de
// servidor a servidor.
// ============================================================

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const clave = req.headers['x-device-key'];
    const claveEsperada = this.configService.get<string>('DRONES_DEVICE_API_KEY');

    if (!claveEsperada) {
      throw new UnauthorizedException('DRONES_DEVICE_API_KEY no configurada en el servidor.');
    }
    if (clave !== claveEsperada) {
      throw new UnauthorizedException('Clave de dispositivo inválida.');
    }
    return true;
  }
}

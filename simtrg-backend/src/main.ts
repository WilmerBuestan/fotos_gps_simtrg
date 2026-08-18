import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { join } from 'path'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Servir archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  })

  // Configuración estricta de CORS para desarrollo local y túneles
  app.enableCors({
    origin: [
      'http://localhost:5173',          // Frontend local normal
      /^https:\/\/.*\.devtunnels\.ms$/  // Cualquier túnel dinámico de VS Code
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Permitir envío de cookies/tokens de sesión
  })

  const apiPrefix = '/api/v1'
  app.setGlobalPrefix(apiPrefix)

  await app.listen(3000)
  console.log(`🚀 SIMTRG Backend corriendo en: http://localhost:3000${apiPrefix}`)
  console.log(`📚 Swagger Docs en: http://localhost:3000${apiPrefix}/docs`)
  console.log(`🔒 Entorno: ${process.env.NODE_ENV || 'development'}`)
}

bootstrap()
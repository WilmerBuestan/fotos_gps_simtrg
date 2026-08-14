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

  app.enableCors()

  const apiPrefix = '/api/v1'
  app.setGlobalPrefix(apiPrefix)

  await app.listen(3000)
  console.log(`🚀 SIMTRG Backend corriendo en: http://localhost:3000${apiPrefix}`)
  console.log(`📚 Swagger Docs en: http://localhost:3000${apiPrefix}/docs`)
  console.log(`🔒 Entorno: ${process.env.NODE_ENV || 'development'}`)
}

bootstrap()

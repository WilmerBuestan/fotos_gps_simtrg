import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsuariosUbicacionSchema1786690000000 implements MigrationInterface {
  name = 'UsuariosUbicacionSchema1786690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Última ubicación conocida del usuario (capturada en login/logout vía
    // geolocalización del navegador). Sin backfill: es un dato nuevo, no
    // hay ubicaciones históricas que migrar.
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "ultima_ubicacion_lat" double precision,
      ADD COLUMN IF NOT EXISTS "ultima_ubicacion_lon" double precision,
      ADD COLUMN IF NOT EXISTS "ultima_ubicacion_provincia" character varying,
      ADD COLUMN IF NOT EXISTS "ultima_ubicacion_canton" character varying,
      ADD COLUMN IF NOT EXISTS "ultima_ubicacion_parroquia" character varying,
      ADD COLUMN IF NOT EXISTS "ultima_ubicacion_fecha" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN IF EXISTS "ultima_ubicacion_lat",
      DROP COLUMN IF EXISTS "ultima_ubicacion_lon",
      DROP COLUMN IF EXISTS "ultima_ubicacion_provincia",
      DROP COLUMN IF EXISTS "ultima_ubicacion_canton",
      DROP COLUMN IF EXISTS "ultima_ubicacion_parroquia",
      DROP COLUMN IF EXISTS "ultima_ubicacion_fecha"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';
import { ECUADOR_CANTONES } from './data/ecuador-cantones.data';

export class LimitesGeograficosSchema1786660000000 implements MigrationInterface {
  name = 'LimitesGeograficosSchema1786660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabla de límites geográficos (polígonos de cantones) para geocodificación
    // inversa real vía PostGIS, en vez de aproximaciones por bounding-box.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "limites_cantones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provincia" character varying NOT NULL,
        "canton" character varying NOT NULL,
        "geom" geometry(MultiPolygon, 4326) NOT NULL,
        CONSTRAINT "PK_limites_cantones" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_limites_cantones_geom"
      ON "limites_cantones" USING GIST ("geom")
    `);

    const [{ cnt }] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM "limites_cantones"`,
    );
    if (Number(cnt) === 0) {
      for (const c of ECUADOR_CANTONES) {
        await queryRunner.query(
          `INSERT INTO "limites_cantones" ("provincia", "canton", "geom")
           VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))`,
          [c.provincia, c.canton, JSON.stringify(c.geometry)],
        );
      }
    }

    // Columnas denormalizadas de ubicación administrativa
    await queryRunner.query(`
      ALTER TABLE "fotos_dron"
      ADD COLUMN IF NOT EXISTS "provincia" character varying,
      ADD COLUMN IF NOT EXISTS "canton" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "eventos_tacticos"
      ADD COLUMN IF NOT EXISTS "provincia" character varying,
      ADD COLUMN IF NOT EXISTS "canton" character varying
    `);

    // Backfill de registros existentes con coordenadas
    await queryRunner.query(`
      UPDATE "fotos_dron" f
      SET "provincia" = lc."provincia", "canton" = lc."canton"
      FROM "limites_cantones" lc
      WHERE f."provincia" IS NULL
        AND f."latitud" IS NOT NULL
        AND f."longitud" IS NOT NULL
        AND ST_Contains(lc."geom", ST_SetSRID(ST_MakePoint(f."longitud", f."latitud"), 4326))
    `);
    await queryRunner.query(`
      UPDATE "eventos_tacticos" e
      SET "provincia" = lc."provincia", "canton" = lc."canton"
      FROM "limites_cantones" lc
      WHERE e."provincia" IS NULL
        AND ST_Contains(lc."geom", ST_SetSRID(ST_MakePoint(e."longitud", e."latitud"), 4326))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "eventos_tacticos" DROP COLUMN IF EXISTS "provincia", DROP COLUMN IF EXISTS "canton"`);
    await queryRunner.query(`ALTER TABLE "fotos_dron" DROP COLUMN IF EXISTS "provincia", DROP COLUMN IF EXISTS "canton"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "limites_cantones"`);
  }
}

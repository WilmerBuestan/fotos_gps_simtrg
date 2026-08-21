import { MigrationInterface, QueryRunner } from 'typeorm';

export class FotosEventosParroquiaSchema1786700000000
  implements MigrationInterface
{
  name = 'FotosEventosParroquiaSchema1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Columna denormalizada de parroquia, mismo patrón que provincia/canton
    // (ver LimitesGeograficosSchema1786660000000).
    await queryRunner.query(`
      ALTER TABLE "fotos_dron"
      ADD COLUMN IF NOT EXISTS "parroquia" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "eventos_tacticos"
      ADD COLUMN IF NOT EXISTS "parroquia" character varying
    `);

    // Backfill de registros existentes con coordenadas
    await queryRunner.query(`
      UPDATE "fotos_dron" f
      SET "parroquia" = lp."parroquia"
      FROM "limites_parroquias" lp
      WHERE f."parroquia" IS NULL
        AND f."latitud" IS NOT NULL
        AND f."longitud" IS NOT NULL
        AND ST_Contains(lp."geom", ST_SetSRID(ST_MakePoint(f."longitud", f."latitud"), 4326))
    `);
    await queryRunner.query(`
      UPDATE "eventos_tacticos" e
      SET "parroquia" = lp."parroquia"
      FROM "limites_parroquias" lp
      WHERE e."parroquia" IS NULL
        AND ST_Contains(lp."geom", ST_SetSRID(ST_MakePoint(e."longitud", e."latitud"), 4326))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "eventos_tacticos" DROP COLUMN IF EXISTS "parroquia"`);
    await queryRunner.query(`ALTER TABLE "fotos_dron" DROP COLUMN IF EXISTS "parroquia"`);
  }
}

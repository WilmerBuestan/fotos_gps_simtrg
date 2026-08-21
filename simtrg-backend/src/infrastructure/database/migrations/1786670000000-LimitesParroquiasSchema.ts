import { MigrationInterface, QueryRunner } from 'typeorm';
import { ECUADOR_PARROQUIAS } from './data/ecuador-parroquias.data';

export class LimitesParroquiasSchema1786670000000
  implements MigrationInterface
{
  name = 'LimitesParroquiasSchema1786670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabla de límites geográficos (polígonos de parroquias) para
    // geocodificación inversa vía PostGIS. Mismo patrón que
    // limites_cantones (ver LimitesGeograficosSchema1786660000000).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "limites_parroquias" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provincia" character varying NOT NULL,
        "canton" character varying NOT NULL,
        "parroquia" character varying NOT NULL,
        "codigo_inec" character varying NOT NULL,
        "geom" geometry(MultiPolygon, 4326) NOT NULL,
        CONSTRAINT "PK_limites_parroquias" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_limites_parroquias_geom"
      ON "limites_parroquias" USING GIST ("geom")
    `);

    const [{ cnt }] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM "limites_parroquias"`,
    );
    if (Number(cnt) === 0) {
      for (const p of ECUADOR_PARROQUIAS) {
        // ST_Multi normaliza Polygon -> MultiPolygon: la fuente (ArcGIS/INEC)
        // trae una mezcla de ambos tipos y la columna exige MultiPolygon.
        await queryRunner.query(
          `INSERT INTO "limites_parroquias"
             ("provincia", "canton", "parroquia", "codigo_inec", "geom")
           VALUES ($1, $2, $3, $4, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)))`,
          [p.provincia, p.canton, p.parroquia, p.codigoInec, JSON.stringify(p.geometry)],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "limites_parroquias"`);
  }
}

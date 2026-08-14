import { MigrationInterface, QueryRunner } from 'typeorm';

export class FotoDronSchema1786632667274 implements MigrationInterface {
  name = 'FotoDronSchema1786632667274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum de origen de coordenada
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'fotos_dron_origen_coordenada_enum'
    `);

    if (enumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."fotos_dron_origen_coordenada_enum"
        AS ENUM('GPS_EXIF', 'MANUAL')
      `);
    }

    // Crear tabla fotos_dron
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fotos_dron" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ruta_archivo" character varying NOT NULL,
        "ruta_miniatura" character varying NOT NULL,
        "latitud" double precision,
        "longitud" double precision,
        "fecha_captura" TIMESTAMPTZ,
        "es_coordenada_manual" boolean NOT NULL DEFAULT false,
        "origen_coordenada" "public"."fotos_dron_origen_coordenada_enum",
        "dentro_de_geocerca" boolean NOT NULL DEFAULT false,
        "nombre_archivo" character varying NOT NULL,
        "tamano_bytes" bigint NOT NULL,
        "operador_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fotos_dron" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fotos_dron_operador"
          FOREIGN KEY ("operador_id")
          REFERENCES "usuarios"("id")
          ON DELETE RESTRICT
      )
    `);

    // Índices para consultas frecuentes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fotos_dron_operador"
      ON "fotos_dron" ("operador_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fotos_dron_geocerca"
      ON "fotos_dron" ("dentro_de_geocerca")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fotos_dron_fecha"
      ON "fotos_dron" ("fecha_captura")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fotos_dron"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."fotos_dron_origen_coordenada_enum"`,
    );
  }
}

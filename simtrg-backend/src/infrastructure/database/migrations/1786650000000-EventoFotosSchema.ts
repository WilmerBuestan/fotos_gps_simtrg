import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventoFotosSchema1786650000000 implements MigrationInterface {
  name = 'EventoFotosSchema1786650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "evento_fotos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "evento_tactico_id" uuid NOT NULL,
        "ruta_archivo" character varying NOT NULL,
        "ruta_miniatura" character varying NOT NULL,
        "nombre_archivo" character varying NOT NULL,
        "tamano_bytes" bigint NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_evento_fotos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_evento_fotos_evento"
          FOREIGN KEY ("evento_tactico_id")
          REFERENCES "eventos_tacticos"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_evento_fotos_evento"
      ON "evento_fotos" ("evento_tactico_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "evento_fotos"`);
  }
}

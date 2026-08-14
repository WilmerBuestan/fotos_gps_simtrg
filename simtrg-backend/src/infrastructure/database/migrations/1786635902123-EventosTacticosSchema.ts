import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventosTacticosSchema1786635902123 implements MigrationInterface {
  name = 'EventosTacticosSchema1786635902123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabla tipos_actividad
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tipos_actividad" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(100) NOT NULL,
        "descripcion" text,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tipos_actividad" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tipos_actividad_nombre" UNIQUE ("nombre")
      )
    `);

    // Tabla eventos_tacticos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "eventos_tacticos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fecha_hora" TIMESTAMPTZ NOT NULL,
        "latitud" double precision NOT NULL,
        "longitud" double precision NOT NULL,
        "tipo_actividad_id" uuid NOT NULL,
        "descripcion_detallada" text NOT NULL,
        "operador_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_eventos_tacticos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eventos_tipo_actividad"
          FOREIGN KEY ("tipo_actividad_id")
          REFERENCES "tipos_actividad"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "FK_eventos_operador"
          FOREIGN KEY ("operador_id")
          REFERENCES "usuarios"("id")
          ON DELETE RESTRICT
      )
    `);

    // Índices para heatmap y consultas frecuentes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eventos_fecha_hora"
      ON "eventos_tacticos" ("fecha_hora")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eventos_tipo"
      ON "eventos_tacticos" ("tipo_actividad_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eventos_operador"
      ON "eventos_tacticos" ("operador_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eventos_coordenadas"
      ON "eventos_tacticos" ("latitud", "longitud")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "eventos_tacticos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tipos_actividad"`);
  }
}

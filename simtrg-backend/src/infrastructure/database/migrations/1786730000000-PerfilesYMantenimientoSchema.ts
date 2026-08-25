import { MigrationInterface, QueryRunner } from 'typeorm';

export class PerfilesYMantenimientoSchema1786730000000 implements MigrationInterface {
  name = 'PerfilesYMantenimientoSchema1786730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Perfil de usuario ----
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "foto" character varying,
      ADD COLUMN IF NOT EXISTS "grado" character varying,
      ADD COLUMN IF NOT EXISTS "fecha_nacimiento" date,
      ADD COLUMN IF NOT EXISTS "cedula" character varying,
      ADD COLUMN IF NOT EXISTS "chapa" character varying
    `);

    // ---- Perfil de dron ----
    await queryRunner.query(`
      ALTER TABLE "dron_fisico"
      ADD COLUMN IF NOT EXISTS "foto" character varying,
      ADD COLUMN IF NOT EXISTS "version" character varying,
      ADD COLUMN IF NOT EXISTS "anio_compra" integer,
      ADD COLUMN IF NOT EXISTS "horas_vuelo" numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "bateria_porcentaje" integer,
      ADD COLUMN IF NOT EXISTS "bateria_actualizada" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "ubicacion_bodega" character varying
    `);

    // ---- Tareas de mantenimiento ----
    const enumPrioridadExiste = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'tarea_mantenimiento_prioridad_enum'
    `);
    if (enumPrioridadExiste.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."tarea_mantenimiento_prioridad_enum" AS ENUM('ALTA', 'MEDIA', 'BAJA')
      `);
    }
    const enumEstadoExiste = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'tarea_mantenimiento_estado_enum'
    `);
    if (enumEstadoExiste.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."tarea_mantenimiento_estado_enum" AS ENUM('PENDIENTE', 'COMPLETADA')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tarea_mantenimiento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dron_id" uuid NOT NULL,
        "descripcion" text NOT NULL,
        "prioridad" "public"."tarea_mantenimiento_prioridad_enum" NOT NULL DEFAULT 'MEDIA',
        "tecnico_asignado" character varying,
        "estado" "public"."tarea_mantenimiento_estado_enum" NOT NULL DEFAULT 'PENDIENTE',
        "creado_por_id" uuid NOT NULL,
        "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "fecha_completada" TIMESTAMPTZ,
        CONSTRAINT "PK_tarea_mantenimiento" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tarea_mantenimiento_dron" FOREIGN KEY ("dron_id")
          REFERENCES "dron_fisico" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tarea_mantenimiento_creado_por" FOREIGN KEY ("creado_por_id")
          REFERENCES "usuarios" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tarea_mantenimiento_pendientes" ON "tarea_mantenimiento" ("estado")
      WHERE "estado" = 'PENDIENTE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tarea_mantenimiento"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tarea_mantenimiento_estado_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tarea_mantenimiento_prioridad_enum"`);
    await queryRunner.query(`
      ALTER TABLE "dron_fisico"
      DROP COLUMN IF EXISTS "ubicacion_bodega",
      DROP COLUMN IF EXISTS "bateria_actualizada",
      DROP COLUMN IF EXISTS "bateria_porcentaje",
      DROP COLUMN IF EXISTS "horas_vuelo",
      DROP COLUMN IF EXISTS "anio_compra",
      DROP COLUMN IF EXISTS "version",
      DROP COLUMN IF EXISTS "foto"
    `);
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN IF EXISTS "chapa",
      DROP COLUMN IF EXISTS "cedula",
      DROP COLUMN IF EXISTS "fecha_nacimiento",
      DROP COLUMN IF EXISTS "grado",
      DROP COLUMN IF EXISTS "foto"
    `);
  }
}

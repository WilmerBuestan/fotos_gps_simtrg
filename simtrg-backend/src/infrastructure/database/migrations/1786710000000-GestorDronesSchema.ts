import { MigrationInterface, QueryRunner } from 'typeorm';

export class GestorDronesSchema1786710000000 implements MigrationInterface {
  name = 'GestorDronesSchema1786710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rol nuevo: BODEGUERO
    await queryRunner.query(`
      ALTER TYPE "public"."usuarios_rol_enum" ADD VALUE IF NOT EXISTS 'BODEGUERO'
    `);

    // Tarjeta RFID personal (1 a 1 con el usuario)
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "tag_rfid" character varying
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_usuarios_tag_rfid" ON "usuarios" ("tag_rfid")
      WHERE "tag_rfid" IS NOT NULL
    `);

    // Estado del dron físico
    const enumEstadoExiste = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'dron_fisico_estado_enum'
    `);
    if (enumEstadoExiste.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."dron_fisico_estado_enum"
        AS ENUM('DISPONIBLE', 'PRESTADO', 'MANTENIMIENTO', 'BAJA')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dron_fisico" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_interno" character varying NOT NULL,
        "modelo" character varying NOT NULL,
        "marca" character varying,
        "tag_rfid" character varying,
        "estado" "public"."dron_fisico_estado_enum" NOT NULL DEFAULT 'DISPONIBLE',
        "observaciones" text,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dron_fisico" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dron_fisico_codigo_interno" UNIQUE ("codigo_interno")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_dron_fisico_tag_rfid" ON "dron_fisico" ("tag_rfid")
      WHERE "tag_rfid" IS NOT NULL
    `);

    // Origen del movimiento (ESP32 o registrado manualmente desde la web)
    const enumOrigenExiste = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'prestamo_dron_origen_enum'
    `);
    if (enumOrigenExiste.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."prestamo_dron_origen_enum" AS ENUM('ESP32', 'MANUAL')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prestamo_dron" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dron_id" uuid NOT NULL,
        "usuario_salida_id" uuid NOT NULL,
        "fecha_salida" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "usuario_entrada_id" uuid,
        "fecha_entrada" TIMESTAMPTZ,
        "origen" "public"."prestamo_dron_origen_enum" NOT NULL DEFAULT 'ESP32',
        "observaciones" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prestamo_dron" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prestamo_dron_dron" FOREIGN KEY ("dron_id")
          REFERENCES "dron_fisico" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_prestamo_dron_usuario_salida" FOREIGN KEY ("usuario_salida_id")
          REFERENCES "usuarios" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_prestamo_dron_usuario_entrada" FOREIGN KEY ("usuario_entrada_id")
          REFERENCES "usuarios" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_prestamo_dron_dron_id" ON "prestamo_dron" ("dron_id")
    `);
    // Búsqueda rápida del préstamo "en curso" de un dron (fecha_entrada IS NULL)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_prestamo_dron_en_curso" ON "prestamo_dron" ("dron_id")
      WHERE "fecha_entrada" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "prestamo_dron"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."prestamo_dron_origen_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dron_fisico"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."dron_fisico_estado_enum"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "tag_rfid"`);
    // Nota: Postgres no permite quitar un valor de un enum fácilmente;
    // no se revierte la adición de 'BODEGUERO' al enum de roles.
  }
}

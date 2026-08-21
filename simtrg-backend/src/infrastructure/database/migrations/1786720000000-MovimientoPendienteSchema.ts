import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovimientoPendienteSchema1786720000000 implements MigrationInterface {
  name = 'MovimientoPendienteSchema1786720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumTipoExiste = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'movimiento_pendiente_tipo_enum'
    `);
    if (enumTipoExiste.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."movimiento_pendiente_tipo_enum" AS ENUM('FALTA_USUARIO', 'FALTA_DRON')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "movimiento_pendiente" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo" "public"."movimiento_pendiente_tipo_enum" NOT NULL,
        "dron_id" uuid,
        "usuario_id" uuid,
        "tag_conocido" character varying NOT NULL,
        "resuelto" boolean NOT NULL DEFAULT false,
        "resuelto_por_id" uuid,
        "prestamo_id" uuid,
        "fecha_resolucion" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_movimiento_pendiente" PRIMARY KEY ("id"),
        CONSTRAINT "FK_movimiento_pendiente_dron" FOREIGN KEY ("dron_id")
          REFERENCES "dron_fisico" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_movimiento_pendiente_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_movimiento_pendiente_resuelto_por" FOREIGN KEY ("resuelto_por_id")
          REFERENCES "usuarios" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_movimiento_pendiente_prestamo" FOREIGN KEY ("prestamo_id")
          REFERENCES "prestamo_dron" ("id") ON DELETE RESTRICT
      )
    `);

    // Listado rápido de pendientes (banner de la web)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_movimiento_pendiente_resuelto" ON "movimiento_pendiente" ("resuelto")
      WHERE "resuelto" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimiento_pendiente"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."movimiento_pendiente_tipo_enum"`);
  }
}

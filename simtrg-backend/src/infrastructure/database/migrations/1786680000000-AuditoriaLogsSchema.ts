import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditoriaLogsSchema1786680000000 implements MigrationInterface {
  name = 'AuditoriaLogsSchema1786680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'auditoria_logs_tipo_evento_enum'
    `);

    if (enumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."auditoria_logs_tipo_evento_enum"
        AS ENUM('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auditoria_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "tipo_evento" "public"."auditoria_logs_tipo_evento_enum" NOT NULL,
        "metodo_http" character varying(10) NOT NULL,
        "url" character varying(500) NOT NULL,
        "usuario_id" uuid,
        "username" character varying(50),
        "rol" character varying(30),
        "ip" character varying(45),
        "latitud" double precision,
        "longitud" double precision,
        "provincia" character varying,
        "canton" character varying,
        "parroquia" character varying,
        "detalle" jsonb,
        "exitoso" boolean NOT NULL DEFAULT true,
        "mensaje_error" text,
        CONSTRAINT "PK_auditoria_logs" PRIMARY KEY ("id")
      )
    `);

    // Sin FK hacia "usuarios": el historial de auditoría debe sobrevivir
    // aunque el usuario que generó el evento sea eliminado después.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auditoria_logs_timestamp" ON "auditoria_logs" ("timestamp")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auditoria_logs_tipo_evento" ON "auditoria_logs" ("tipo_evento")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auditoria_logs_usuario_id" ON "auditoria_logs" ("usuario_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auditoria_logs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."auditoria_logs_tipo_evento_enum"`);
  }
}

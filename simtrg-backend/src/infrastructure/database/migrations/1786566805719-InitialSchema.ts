import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1786566805719 implements MigrationInterface {
  name = 'InitialSchema1786566805719';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'usuarios_rol_enum'
    `);

    if (enumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('OPERADOR', 'SUPERVISOR', 'ADMINISTRADOR')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "usuarios" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(100) NOT NULL,
        "apellido" character varying(100) NOT NULL,
        "username" character varying(50) NOT NULL,
        "password_hash" character varying NOT NULL,
        "rol" "public"."usuarios_rol_enum" NOT NULL DEFAULT 'OPERADOR',
        "activo" boolean NOT NULL DEFAULT true,
        "ultimo_acceso" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_username" UNIQUE ("username")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "usuarios"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."usuarios_rol_enum"`);
  }
}
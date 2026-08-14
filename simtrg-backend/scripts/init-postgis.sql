-- Extensiones PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear usuario si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'simtrg_user') THEN
    CREATE USER simtrg_user WITH PASSWORD 'simtrg_secret_password';
  END IF;
END $$;

-- Permisos sobre la base de datos
GRANT ALL PRIVILEGES ON DATABASE simtrg_db TO simtrg_user;

-- Permisos automáticos sobre tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO simtrg_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO simtrg_user;
GRANT ALL ON SCHEMA public TO simtrg_user;
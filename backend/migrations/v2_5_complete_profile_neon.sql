-- ============================================================
-- MIGRACIÓN V2.5 — Perfil fiscal completo (RIF + dirección)
-- Ejecutar en Neon SQL Editor una sola vez (idempotente).
-- ============================================================

-- 1) Renombrar address → fiscal_address (idempotente vía DO block)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'address'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'fiscal_address'
  ) THEN
    ALTER TABLE users RENAME COLUMN address TO fiscal_address;
  END IF;
END$$;

-- 2) Si fiscal_address aún no existe (caso fresh install), crearla
ALTER TABLE users ADD COLUMN IF NOT EXISTS fiscal_address TEXT;

-- 3) Nuevas columnas RIF + URL del archivo
ALTER TABLE users ADD COLUMN IF NOT EXISTS rif VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rif_file_url VARCHAR(500);

-- 4) Índice único parcial sobre RIF (permite NULLs múltiples, único cuando se setea)
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_rif
  ON users (rif)
  WHERE rif IS NOT NULL;

-- 5) Verificación
SELECT column_name, is_nullable, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('rif', 'rif_file_url', 'fiscal_address', 'address')
ORDER BY column_name;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname = 'ux_users_rif';

-- ============================================================
-- MIGRACIÓN V2.4 — OAuth Google (SC-AUTH-OAUTH)
-- Ejecutar en Neon SQL Editor una sola vez (idempotente).
-- ============================================================

-- 1) hashed_password nullable (usuarios OAuth no tienen password local)
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;

-- 2) Índice único sobre (oauth_provider, oauth_id) — dedupe Google accounts
-- Las columnas oauth_provider/oauth_id ya existen desde SC-SECURITY-01.
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_oauth_identity
  ON users (oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

-- Verificación rápida
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('hashed_password', 'oauth_provider', 'oauth_id');

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname = 'ux_users_oauth_identity';

-- ============================================================
-- MIGRACIÓN V2.8 — Sistema de API Keys
-- Idempotente, solo CREATE TABLE/INDEX IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    key_hash        VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hex del raw key
    prefix          VARCHAR(20) NOT NULL,          -- Primeros chars visibles (ej: "pcjdg_a1b2c3d4")
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMP WITH TIME ZONE,      -- NULL = no expira
    last_used_at    TIMESTAMP WITH TIME ZONE,
    usage_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_api_keys_user
  ON api_keys (user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash_active
  ON api_keys (key_hash)
  WHERE is_active = TRUE;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;

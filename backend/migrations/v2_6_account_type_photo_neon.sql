-- ============================================================
-- MIGRACIÓN V2.6 — Tipo de cuenta + foto de perfil
-- Idempotente, solo ADD COLUMN (compatible con código viejo y nuevo).
-- Se puede correr ANTES o DESPUÉS del deploy sin riesgo.
-- ============================================================

-- 1) Tipo de cuenta: 'empresa' o 'particular' (NULL hasta que el usuario elija)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20);

-- CHECK constraint solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_account_type_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_type_check
      CHECK (account_type IS NULL OR account_type IN ('empresa', 'particular'));
  END IF;
END$$;

-- 2) Foto de perfil (logo de empresa o avatar personal)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);

-- 3) Verificación
SELECT column_name, is_nullable, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('account_type', 'profile_photo_url')
ORDER BY column_name;

SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'users' AND con.conname = 'users_account_type_check';

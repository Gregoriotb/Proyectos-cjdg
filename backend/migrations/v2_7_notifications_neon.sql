-- ============================================================
-- MIGRACIÓN V2.7 — Sistema de Notificaciones
-- Idempotente. Solo CREATE TABLE/INDEX IF NOT EXISTS — sin riesgo.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}'::jsonb,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para las queries más frecuentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Índice parcial para count rápido de no-leídas (la query más común vía polling)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id)
  WHERE is_read = FALSE;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'notifications';

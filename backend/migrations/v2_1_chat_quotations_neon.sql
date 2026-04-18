-- ============================================================
-- MIGRACIÓN V2.1 CONSOLIDADA — Chat-Cotizaciones CJDG
-- Pegar TODO en Neon SQL Editor (idempotente, seguro re-ejecutar).
-- Reemplaza el bloque anterior de V2.1 y el de user fields.
-- ============================================================

-- 1) Campos de perfil en users (para mostrar nombre/teléfono/empresa en el chat)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name   VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone        VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address      TEXT;

-- Semilla no destructiva: separa full_name en first/last si vacíos
UPDATE users
SET first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
    last_name  = COALESCE(
        last_name,
        NULLIF(trim(substring(full_name FROM position(' ' IN full_name))), '')
    )
WHERE full_name IS NOT NULL;

-- 2) Tabla quotation_threads (service_id INTEGER → compatible con service_catalog.id)
CREATE TABLE IF NOT EXISTS quotation_threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id      INTEGER REFERENCES service_catalog(id) ON DELETE SET NULL,
    service_name    VARCHAR(255) NOT NULL,
    company_name    VARCHAR(255),
    client_address  TEXT,
    location_notes  TEXT,
    budget_estimate DECIMAL(12,2),
    requirements    TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','active','quoted','negotiating','closed','cancelled')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE,
    client_unread   INTEGER DEFAULT 0,
    admin_unread    INTEGER DEFAULT 0
);

-- Reparación: si la tabla ya existía con service_id UUID, conviértela a INTEGER.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quotation_threads'
          AND column_name = 'service_id'
          AND data_type = 'uuid'
    ) THEN
        EXECUTE 'ALTER TABLE quotation_threads DROP CONSTRAINT IF EXISTS quotation_threads_service_id_fkey';
        EXECUTE 'ALTER TABLE quotation_threads ALTER COLUMN service_id DROP DEFAULT';
        EXECUTE 'ALTER TABLE quotation_threads ALTER COLUMN service_id TYPE INTEGER USING NULL';
        EXECUTE 'ALTER TABLE quotation_threads ADD CONSTRAINT quotation_threads_service_id_fkey
                 FOREIGN KEY (service_id) REFERENCES service_catalog(id) ON DELETE SET NULL';
    END IF;
END$$;

-- 3) Tabla chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES quotation_threads(id) ON DELETE CASCADE,
    sender_type     VARCHAR(10) NOT NULL CHECK (sender_type IN ('client','admin','system')),
    sender_id       UUID REFERENCES users(id),
    content         TEXT NOT NULL,
    message_type    VARCHAR(20) DEFAULT 'text'
                    CHECK (message_type IN ('text','file','image','budget_update','status_change','system')),
    attachment_url  TEXT,
    attachment_name VARCHAR(255),
    attachment_type VARCHAR(50),
    metadata        JSONB DEFAULT '{}',
    read_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4) Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_threads_client   ON quotation_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_threads_status   ON quotation_threads(status);
CREATE INDEX IF NOT EXISTS idx_threads_updated  ON quotation_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_last_msg ON quotation_threads(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_thread  ON chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread  ON chat_messages(thread_id, read_at) WHERE read_at IS NULL;

-- 5) Trigger updated_at (re-creable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quotation_threads_updated_at ON quotation_threads;
CREATE TRIGGER update_quotation_threads_updated_at
    BEFORE UPDATE ON quotation_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6) Verificación rápida — debe retornar ambos nombres de tabla
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_name = 'quotation_threads' AND column_name IN ('id','service_id','client_id'))
   OR (table_name = 'chat_messages'     AND column_name IN ('id','metadata','attachment_url'))
   OR (table_name = 'users'              AND column_name IN ('first_name','last_name','phone','company_name','address'))
ORDER BY table_name, column_name;

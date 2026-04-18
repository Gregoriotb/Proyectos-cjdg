-- ============================================================
-- MIGRACIÓN V2.3 — Invoice Mentions en chat-cotizaciones
-- Ejecutar en Neon SQL Editor una sola vez (idempotente).
-- ============================================================

-- Ampliar el CHECK constraint de message_type para aceptar 'invoice_mention'
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN (
    'text',
    'file',
    'image',
    'budget_update',
    'status_change',
    'system',
    'invoice_mention'
  ));

-- Verificación rápida
SELECT con.conname, pg_get_constraintdef(con.oid) AS definicion
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'chat_messages'
  AND con.conname = 'chat_messages_message_type_check';

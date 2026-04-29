"""
[CONTEXT: DEPLOY] - Migración resiliente para arranque en Railway.

Problema: la DB de producción acumuló cambios aplicados manualmente (vía SQL
editor de Neon u otro path), así que `alembic upgrade head` falla con
DuplicateColumn al intentar re-aplicar migraciones cuyo schema ya existe.

Estrategia:
  1. Aplicar el delta de FEAT-Historial-v2.4 con SQL idempotente
     (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS).
  2. Stampar alembic_version a la revisión actual del repo (head).

Usamos SQLAlchemy en lugar de psycopg2.connect directo porque la URL de
Neon trae parámetros que el parser DSN crudo de psycopg2 no acepta
(ej: channel_binding, options, sslmode con valores compuestos). SQLAlchemy
los normaliza correctamente.

Si en el futuro se agregan más migraciones, este script se EXTIENDE con
otro bloque idempotente, no se reescribe. El día que la DB esté sana
podemos eliminarlo y volver a `alembic upgrade head` normal.
"""
import logging
import os
import sys

from sqlalchemy import create_engine, text

# DATABASE_URL viene del env (mismo origen que database.py de la app).
# No importamos `from database` porque scripts/ no está en el sys.path por
# default cuando se corre 'python scripts/migrate_resilient.py'.
DATABASE_URL = os.getenv("DATABASE_URL")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("migrate_resilient")


# Revisión actual head — debe coincidir con la última migración del repo.
TARGET_REVISION = "f1a2b3c4d5e6"


# SQL idempotente del delta FEAT-Historial-v2.4 (migración f1a2b3c4d5e6).
# Cada statement es seguro de re-ejecutar (IF NOT EXISTS).
DELTA_SQL = [
    # --- Tablas nuevas ---
    """
    CREATE TABLE IF NOT EXISTS transaction_history (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(30) NOT NULL,
        original_id VARCHAR(50) NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id),
        numero_documento VARCHAR(50) NOT NULL,
        status_at_archive VARCHAR(30) NOT NULL,
        total NUMERIC(12,2),
        snapshot_data JSONB NOT NULL,
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_by UUID REFERENCES users(id),
        reactivated_at TIMESTAMPTZ
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_transaction_history_user_id ON transaction_history(user_id);",
    "CREATE INDEX IF NOT EXISTS ix_transaction_history_source ON transaction_history(source_type, original_id);",
    "CREATE INDEX IF NOT EXISTS ix_transaction_history_archived_at ON transaction_history(archived_at);",

    """
    CREATE TABLE IF NOT EXISTS transaction_history_items (
        id SERIAL PRIMARY KEY,
        history_id INTEGER NOT NULL REFERENCES transaction_history(id) ON DELETE CASCADE,
        descripcion VARCHAR(300) NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio_unitario NUMERIC(12,2),
        subtotal NUMERIC(12,2)
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_transaction_history_items_history_id ON transaction_history_items(history_id);",

    """
    CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        catalog_item_id INTEGER NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
        movement_type VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL,
        reference_type VARCHAR(30),
        reference_id VARCHAR(50),
        user_id UUID REFERENCES users(id),
        notes VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_stock_movements_catalog_item_id ON stock_movements(catalog_item_id);",

    # --- invoices ---
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20) NOT NULL DEFAULT 'factura';",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archivado_en TIMESTAMPTZ;",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS historial_id INTEGER REFERENCES transaction_history(id);",
    "CREATE INDEX IF NOT EXISTS ix_invoices_archivado_en ON invoices(archivado_en);",

    # --- quotation_threads ---
    "ALTER TABLE quotation_threads ADD COLUMN IF NOT EXISTS fecha_concretada TIMESTAMPTZ;",
    "ALTER TABLE quotation_threads ADD COLUMN IF NOT EXISTS archivado_en TIMESTAMPTZ;",
    "ALTER TABLE quotation_threads ADD COLUMN IF NOT EXISTS historial_id INTEGER REFERENCES transaction_history(id);",
    "ALTER TABLE quotation_threads ADD COLUMN IF NOT EXISTS eliminado_por_cliente BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE quotation_threads ADD COLUMN IF NOT EXISTS eliminado_por_cliente_at TIMESTAMPTZ;",
    "CREATE INDEX IF NOT EXISTS ix_quotation_threads_archivado_en ON quotation_threads(archivado_en);",

    # --- catalog_items ---
    "ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS stock_reservado INTEGER NOT NULL DEFAULT 0;",

    # --- invoice_items ---
    "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS catalog_item_id INTEGER REFERENCES catalog_items(id);",
]


# DDL para asegurar la tabla alembic_version (idempotente).
ENSURE_ALEMBIC_VERSION = """
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
"""


def main() -> int:
    if not DATABASE_URL:
        log.error("DATABASE_URL no está definida")
        return 1

    log.info("Conectando a la base de datos via SQLAlchemy...")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

    try:
        with engine.begin() as conn:
            conn.execute(text(ENSURE_ALEMBIC_VERSION))
            for stmt in DELTA_SQL:
                conn.execute(text(stmt))
            # Stampa la versión: borra todo y deja solo la target
            conn.execute(text("DELETE FROM alembic_version"))
            conn.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:rev)"),
                {"rev": TARGET_REVISION},
            )
        log.info("✓ Delta aplicado y alembic_version stampada a %s", TARGET_REVISION)
    except Exception as e:
        log.exception("Falló la aplicación del delta: %s", e)
        return 1
    finally:
        engine.dispose()

    log.info("✓ Migración resiliente OK. Arrancando uvicorn.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

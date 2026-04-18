"""V2.1: chat-quotations tables + user profile fields

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------- users: campos extendidos para chat-cotizaciones ----------
    op.add_column('users', sa.Column('first_name', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(30), nullable=True))
    op.add_column('users', sa.Column('company_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('address', sa.Text, nullable=True))

    # ---------- quotation_threads ----------
    op.execute("""
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
    """)

    # ---------- chat_messages ----------
    op.execute("""
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
    """)

    # ---------- índices ----------
    op.execute("CREATE INDEX IF NOT EXISTS idx_threads_client ON quotation_threads(client_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_threads_status ON quotation_threads(status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_threads_updated ON quotation_threads(updated_at DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_threads_last_msg ON quotation_threads(last_message_at DESC NULLS LAST);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(thread_id, created_at DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_messages_unread ON chat_messages(thread_id, read_at) WHERE read_at IS NULL;")

    # ---------- trigger updated_at ----------
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS update_quotation_threads_updated_at ON quotation_threads;
        CREATE TRIGGER update_quotation_threads_updated_at
            BEFORE UPDATE ON quotation_threads
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_quotation_threads_updated_at ON quotation_threads;")
    op.execute("DROP TABLE IF EXISTS chat_messages;")
    op.execute("DROP TABLE IF EXISTS quotation_threads;")
    op.drop_column('users', 'address')
    op.drop_column('users', 'company_name')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')

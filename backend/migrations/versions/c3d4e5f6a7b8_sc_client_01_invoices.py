"""SC-CLIENT-01: Create invoices and invoice_items tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear enums con protección contra duplicados
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE invoicetypeenum AS ENUM ('PRODUCT_SALE', 'SERVICE_QUOTATION');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE invoicestatusenum AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'OVERDUE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Tabla invoices
    op.execute("""
        CREATE TABLE invoices (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            invoice_type invoicetypeenum NOT NULL,
            status invoicestatusenum NOT NULL DEFAULT 'PENDING',
            total NUMERIC(12, 2) NOT NULL DEFAULT 0,
            notas TEXT,
            quotation_id INTEGER REFERENCES quotations(id),
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
        CREATE INDEX ix_invoices_user_id ON invoices (user_id);
    """)

    # Tabla invoice_items
    op.execute("""
        CREATE TABLE invoice_items (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER NOT NULL REFERENCES invoices(id),
            descripcion VARCHAR(300) NOT NULL,
            cantidad INTEGER NOT NULL DEFAULT 1,
            precio_unitario NUMERIC(12, 2) NOT NULL,
            subtotal NUMERIC(12, 2) NOT NULL
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS invoice_items")
    op.execute("DROP TABLE IF EXISTS invoices")
    op.execute("DROP TYPE IF EXISTS invoicestatusenum")
    op.execute("DROP TYPE IF EXISTS invoicetypeenum")

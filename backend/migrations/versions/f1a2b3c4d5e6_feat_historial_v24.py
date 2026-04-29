"""FEAT-Historial-Transacciones-v2.4: schema completo

- Crea transaction_history, transaction_history_items, stock_movements
- Agrega archivado_en, historial_id, tipo_documento a invoices
- Agrega archivado_en, fecha_concretada, historial_id a quotation_threads
- Agrega eliminado_por_cliente, eliminado_por_cliente_at a quotation_threads
- Agrega stock_reservado a catalog_items

Revision ID: f1a2b3c4d5e6
Revises: d4e5f6a7b8c9
Create Date: 2026-04-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Nuevas tablas ---
    op.create_table(
        'transaction_history',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('source_type', sa.String(30), nullable=False),  # 'invoice' | 'quotation_thread'
        sa.Column('original_id', sa.String(50), nullable=False),  # int or UUID stringified
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('numero_documento', sa.String(50), nullable=False),  # INV-000123 / COT-000007
        sa.Column('status_at_archive', sa.String(30), nullable=False),
        sa.Column('total', sa.Numeric(12, 2), nullable=True),
        sa.Column('snapshot_data', postgresql.JSONB, nullable=False),  # snapshot completo
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('archived_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reactivated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_transaction_history_source', 'transaction_history', ['source_type', 'original_id'])
    op.create_index('ix_transaction_history_archived_at', 'transaction_history', ['archived_at'])

    op.create_table(
        'transaction_history_items',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('history_id', sa.Integer, sa.ForeignKey('transaction_history.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('descripcion', sa.String(300), nullable=False),
        sa.Column('cantidad', sa.Integer, nullable=False, default=1),
        sa.Column('precio_unitario', sa.Numeric(12, 2), nullable=True),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
    )

    op.create_table(
        'stock_movements',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('catalog_item_id', sa.Integer, sa.ForeignKey('catalog_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('movement_type', sa.String(20), nullable=False),  # 'reserve' | 'release' | 'confirm'
        sa.Column('quantity', sa.Integer, nullable=False),  # signed
        sa.Column('reference_type', sa.String(30), nullable=True),  # 'invoice' | 'manual'
        sa.Column('reference_id', sa.String(50), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- Modificaciones ---
    op.add_column('invoices', sa.Column('tipo_documento', sa.String(20), nullable=False, server_default='factura'))
    op.add_column('invoices', sa.Column('archivado_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('historial_id', sa.Integer, sa.ForeignKey('transaction_history.id'), nullable=True))
    op.create_index('ix_invoices_archivado_en', 'invoices', ['archivado_en'])

    op.add_column('quotation_threads', sa.Column('archivado_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('quotation_threads', sa.Column('fecha_concretada', sa.DateTime(timezone=True), nullable=True))
    op.add_column('quotation_threads', sa.Column('historial_id', sa.Integer, sa.ForeignKey('transaction_history.id'), nullable=True))
    op.add_column('quotation_threads', sa.Column('eliminado_por_cliente', sa.Boolean, nullable=False, server_default=sa.false()))
    op.add_column('quotation_threads', sa.Column('eliminado_por_cliente_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_quotation_threads_archivado_en', 'quotation_threads', ['archivado_en'])

    op.add_column('catalog_items', sa.Column('stock_reservado', sa.Integer, nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('catalog_items', 'stock_reservado')

    op.drop_index('ix_quotation_threads_archivado_en', table_name='quotation_threads')
    op.drop_column('quotation_threads', 'eliminado_por_cliente_at')
    op.drop_column('quotation_threads', 'eliminado_por_cliente')
    op.drop_column('quotation_threads', 'historial_id')
    op.drop_column('quotation_threads', 'fecha_concretada')
    op.drop_column('quotation_threads', 'archivado_en')

    op.drop_index('ix_invoices_archivado_en', table_name='invoices')
    op.drop_column('invoices', 'historial_id')
    op.drop_column('invoices', 'archivado_en')
    op.drop_column('invoices', 'tipo_documento')

    op.drop_table('stock_movements')
    op.drop_table('transaction_history_items')
    op.drop_index('ix_transaction_history_archived_at', table_name='transaction_history')
    op.drop_index('ix_transaction_history_source', table_name='transaction_history')
    op.drop_table('transaction_history')

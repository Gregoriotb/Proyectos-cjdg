"""SC-SECURITY-01: Add username, oauth_provider, oauth_id to users

Revision ID: a1b2c3d4e5f6
Revises: e6abc743f983
Create Date: 2026-04-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e6abc743f983'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- username: obligatorio, único ---
    # Primero se agrega como nullable para poblar los existentes
    op.add_column('users', sa.Column('username', sa.String(50), nullable=True))

    # Generar username a partir del email para usuarios existentes
    op.execute("UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL")

    # Ahora se hace NOT NULL y UNIQUE
    op.alter_column('users', 'username', nullable=False)
    op.create_unique_constraint('uq_users_username', 'users', ['username'])
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # --- OAuth preparación ---
    op.add_column('users', sa.Column('oauth_provider', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('oauth_id', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_index('ix_users_username', table_name='users')
    op.drop_constraint('uq_users_username', 'users', type_='unique')
    op.drop_column('users', 'username')
    op.drop_column('users', 'oauth_provider')
    op.drop_column('users', 'oauth_id')

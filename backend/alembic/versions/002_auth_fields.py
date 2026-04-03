"""Auth fields

Revision ID: 002
Revises: 001
Create Date: 2024-04-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_active to tenants
    op.add_column('tenants', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    
    # Add hashed_password to users
    op.add_column('users', sa.Column('hashed_password', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'hashed_password')
    op.drop_column('tenants', 'is_active')

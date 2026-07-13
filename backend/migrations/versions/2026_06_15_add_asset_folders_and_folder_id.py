"""create asset_folders table and add folder_id to assets

Revision ID: add_asset_folders_and_folder_id
Revises: 
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_asset_folders_and_folder_id'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # Only create asset_folders if it doesn't already exist
    tbls = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name='asset_folders'"))
    tbls = tbls.fetchall()
    if not tbls:
        op.create_table(
            'asset_folders',
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('product_id', sa.String(36), nullable=False),
            sa.Column('parent_id', sa.Integer, nullable=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('path', sa.String(1000), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )

    # Add folder_id to assets table if it doesn't exist
    res = conn.execute(sa.text("PRAGMA table_info('assets')")).fetchall()
    col_names = [r[1] for r in res]
    if 'folder_id' not in col_names:
        op.add_column('assets', sa.Column('folder_id', sa.Integer, nullable=True))


def downgrade():
    # Remove column if present (note: SQLite cannot drop columns easily)
    # We leave assets.folder_id in place during downgrade to avoid data loss.
    op.drop_table('asset_folders')

"""add tasks and milestones tables

Revision ID: 20260615_add_tasks_and_milestones
Revises: 
Create Date: 2026-06-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260615_add_tasks_and_milestones'
# This migration depends on the earlier migration that added asset_folders
down_revision = 'add_asset_folders_and_folder_id'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'milestones',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('product_id', sa.Integer, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('due_date', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )

    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('product_id', sa.Integer, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('assignee_id', sa.Integer, nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='open'),
        sa.Column('priority', sa.String(20), nullable=True, server_default='normal'),
        sa.Column('due_date', sa.DateTime, nullable=True),
        sa.Column('milestone_id', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
    )


def downgrade():
    op.drop_table('tasks')
    op.drop_table('milestones')

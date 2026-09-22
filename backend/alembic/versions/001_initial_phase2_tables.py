"""initial phase 2 database tables

Revision ID: 001_phase2_tables
Revises: 
Create Date: 2026-09-21 17:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_phase2_tables'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), default='user', nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    # 2. Documents
    op.create_table(
        'documents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('url', sa.String(length=2048), nullable=True),
        sa.Column('source', sa.String(length=100), default='manual', nullable=False),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('indexed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), default='pending', nullable=False)
    )

    # 3. Webpages
    op.create_table(
        'webpages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('url', sa.String(length=2048), nullable=False, unique=True),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('crawled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), default='crawled', nullable=False)
    )

    # 4. Crawl Jobs
    op.create_table(
        'crawl_jobs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('seed_url', sa.String(length=1024), nullable=False),
        sa.Column('status', sa.String(length=50), default='pending', nullable=False),
        sa.Column('pages_found', sa.Integer(), default=0, nullable=False),
        sa.Column('pages_processed', sa.Integer(), default=0, nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 5. Search Queries
    op.create_table(
        'search_queries',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('query_text', sa.String(length=512), nullable=False),
        sa.Column('search_mode', sa.String(length=50), default='hybrid', nullable=False),
        sa.Column('execution_time_ms', sa.Integer(), default=0, nullable=False),
        sa.Column('results_count', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 6. Search Results
    op.create_table(
        'search_results',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('query_id', sa.String(length=36), sa.ForeignKey('search_queries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', sa.String(length=36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=True),
        sa.Column('webpage_id', sa.String(length=36), sa.ForeignKey('webpages.id', ondelete='CASCADE'), nullable=True),
        sa.Column('rank_position', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), default=0.0, nullable=False),
        sa.Column('clicked', sa.Boolean(), default=False, nullable=False),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True)
    )

    # 7. Bookmarks
    op.create_table(
        'bookmarks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', sa.String(length=36), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('webpage_id', sa.String(length=36), sa.ForeignKey('webpages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('url', sa.String(length=2048), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

def downgrade() -> None:
    op.drop_table('bookmarks')
    op.drop_table('search_results')
    op.drop_table('search_queries')
    op.drop_table('crawl_jobs')
    op.drop_table('webpages')
    op.drop_table('documents')
    op.drop_table('users')

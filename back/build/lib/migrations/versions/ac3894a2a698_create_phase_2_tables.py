from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'ac3894a2a698'
down_revision: Union[str, Sequence[str], None] = 'cd9c489eaa5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('spaced_repetition_items',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('item_type', sa.Enum('VOCAB', 'GRAMMAR', name='spaced_repetition_item_type'), nullable=False),
    sa.Column('item_id', sa.Uuid(), nullable=False),
    sa.Column('learned_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('next_review_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('interval_days', sa.Float(), server_default='1.0', nullable=False),
    sa.Column('ease_factor', sa.Float(), server_default='2.5', nullable=False),
    sa.Column('mastery_percent', sa.Float(), server_default='0.0', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_spaced_repetition_items_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_spaced_repetition_items')),
    sa.UniqueConstraint('user_id', 'item_type', 'item_id', name='uq_spaced_repetition_user_type_item')
    )
    op.create_index('idx_spaced_repetition_user_next_review', 'spaced_repetition_items', ['user_id', 'next_review_at'], unique=False)
    op.create_index(op.f('ix_spaced_repetition_items_next_review_at'), 'spaced_repetition_items', ['next_review_at'], unique=False)
    op.create_index(op.f('ix_spaced_repetition_items_user_id'), 'spaced_repetition_items', ['user_id'], unique=False)
    op.create_table('vocabulary',
    sa.Column('language_id', sa.UUID(), nullable=False),
    sa.Column('word', sa.String(length=255), nullable=False),
    sa.Column('translation_context', sa.JSON(), nullable=False),
    sa.Column('transcription', sa.String(length=255), nullable=True),
    sa.Column('audio_url', sa.String(length=500), nullable=True),
    sa.Column('cefr_level', sa.Enum('A1', 'A2', 'B1', 'B2', 'C1', 'C2', name='cefr_level'), nullable=False),
    sa.Column('frequency_rank', sa.Integer(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['language_id'], ['languages.id'], name=op.f('fk_vocabulary_language_id_languages')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_vocabulary')),
    sa.UniqueConstraint('language_id', 'word', name='uq_vocabulary_language_word')
    )
    op.create_index(op.f('ix_vocabulary_cefr_level'), 'vocabulary', ['cefr_level'], unique=False)
    op.create_index(op.f('ix_vocabulary_language_id'), 'vocabulary', ['language_id'], unique=False)
    op.create_index(op.f('ix_vocabulary_word'), 'vocabulary', ['word'], unique=False)
    op.create_table('user_errors',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('category', sa.Enum('GRAMMAR', 'VOCABULARY', name='error_category'), nullable=False),
    sa.Column('error_text', sa.Text(), nullable=False),
    sa.Column('correct_text', sa.Text(), nullable=False),
    sa.Column('explanation', sa.Text(), nullable=False),
    sa.Column('related_lesson_id', sa.UUID(), nullable=True),
    sa.Column('occurrence_count', sa.Integer(), server_default='1', nullable=False),
    sa.Column('last_occurred_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['related_lesson_id'], ['lessons.id'], name=op.f('fk_user_errors_related_lesson_id_lessons'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_errors_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_errors'))
    )
    op.create_index('idx_user_errors_user_category', 'user_errors', ['user_id', 'category'], unique=False)
    op.create_index('idx_user_errors_user_occurrence', 'user_errors', ['user_id', 'occurrence_count'], unique=False)
    op.create_index(op.f('ix_user_errors_user_id'), 'user_errors', ['user_id'], unique=False)
    op.create_table('user_vocabulary',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('vocabulary_id', sa.UUID(), nullable=False),
    sa.Column('is_known', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('repetitions_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('errors_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_vocabulary_user_id_users'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vocabulary_id'], ['vocabulary.id'], name=op.f('fk_user_vocabulary_vocabulary_id_vocabulary'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_vocabulary')),
    sa.UniqueConstraint('user_id', 'vocabulary_id', name='uq_user_vocabulary_user_vocabulary')
    )
    op.create_index(op.f('ix_user_vocabulary_user_id'), 'user_vocabulary', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_vocabulary_vocabulary_id'), 'user_vocabulary', ['vocabulary_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_user_vocabulary_vocabulary_id'), table_name='user_vocabulary')
    op.drop_index(op.f('ix_user_vocabulary_user_id'), table_name='user_vocabulary')
    op.drop_table('user_vocabulary')
    op.drop_index(op.f('ix_user_errors_user_id'), table_name='user_errors')
    op.drop_index('idx_user_errors_user_occurrence', table_name='user_errors')
    op.drop_index('idx_user_errors_user_category', table_name='user_errors')
    op.drop_table('user_errors')
    op.drop_index(op.f('ix_vocabulary_word'), table_name='vocabulary')
    op.drop_index(op.f('ix_vocabulary_language_id'), table_name='vocabulary')
    op.drop_index(op.f('ix_vocabulary_cefr_level'), table_name='vocabulary')
    op.drop_table('vocabulary')
    op.drop_index(op.f('ix_spaced_repetition_items_user_id'), table_name='spaced_repetition_items')
    op.drop_index(op.f('ix_spaced_repetition_items_next_review_at'), table_name='spaced_repetition_items')
    op.drop_index('idx_spaced_repetition_user_next_review', table_name='spaced_repetition_items')
    op.drop_table('spaced_repetition_items')


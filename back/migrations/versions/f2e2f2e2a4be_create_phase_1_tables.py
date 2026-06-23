from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f2e2f2e2a4be'
down_revision: Union[str, Sequence[str], None] = '5f9192c1b550'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('languages',
    sa.Column('code', sa.String(length=10), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('native_name', sa.String(length=100), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('icon_url', sa.String(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_languages'))
    )
    op.create_index(op.f('ix_languages_code'), 'languages', ['code'], unique=True)
    op.create_table('lessons',
    sa.Column('language_id', sa.UUID(), nullable=False),
    sa.Column('cefr_level', sa.Enum('A1', 'A2', 'B1', 'B2', 'C1', 'C2', name='cefr_level'), nullable=False),
    sa.Column('topic', sa.String(length=200), nullable=False),
    sa.Column('title', sa.String(length=300), nullable=False),
    sa.Column('content', sa.JSON(), nullable=False),
    sa.Column('audio_urls', sa.JSON(), nullable=True),
    sa.Column('generation_model', sa.String(length=100), nullable=True),
    sa.Column('generation_duration_ms', sa.Integer(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['language_id'], ['languages.id'], name=op.f('fk_lessons_language_id_languages')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lessons'))
    )
    op.create_index('idx_lessons_lang_level_topic', 'lessons', ['language_id', 'cefr_level', 'topic'], unique=False)
    op.create_table('user_goals',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('goal_type', sa.String(length=50), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_primary', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('priority_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_goals_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_goals')),
    sa.UniqueConstraint('user_id', 'goal_type', name='uq_user_goals_user_id_goal_type')
    )
    op.create_index(op.f('ix_user_goals_user_id'), 'user_goals', ['user_id'], unique=False)
    op.create_table('user_profiles',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('target_language_id', sa.UUID(), nullable=False),
    sa.Column('native_language_code', sa.String(length=10), nullable=False),
    sa.Column('current_level', sa.Enum('A1', 'A2', 'B1', 'B2', 'C1', 'C2', name='cefr_level'), nullable=True),
    sa.Column('placement_score', sa.Float(), nullable=True),
    sa.Column('daily_goal_minutes', sa.Integer(), server_default='15', nullable=False),
    sa.Column('streak_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('total_xp', sa.Integer(), server_default='0', nullable=False),
    sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['target_language_id'], ['languages.id'], name=op.f('fk_user_profiles_target_language_id_languages')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_profiles_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_profiles'))
    )
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)
    op.create_table('user_lessons',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('lesson_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=20), server_default='not_started', nullable=False),
    sa.Column('score', sa.Float(), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('time_spent_seconds', sa.Integer(), server_default='0', nullable=False),
    sa.Column('exercises_correct', sa.Integer(), server_default='0', nullable=False),
    sa.Column('exercises_total', sa.Integer(), server_default='0', nullable=False),
    sa.Column('xp_earned', sa.Integer(), server_default='0', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], name=op.f('fk_user_lessons_lesson_id_lessons'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_lessons_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_lessons')),
    sa.UniqueConstraint('user_id', 'lesson_id', name='uq_user_lessons_user_id_lesson_id')
    )
    op.alter_column('users', 'id',
               existing_type=sa.NUMERIC(),
               type_=sa.UUID(),
               existing_nullable=False)

def downgrade() -> None:
    op.alter_column('users', 'id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.drop_table('user_lessons')
    op.drop_index(op.f('ix_user_profiles_user_id'), table_name='user_profiles')
    op.drop_table('user_profiles')
    op.drop_index(op.f('ix_user_goals_user_id'), table_name='user_goals')
    op.drop_table('user_goals')
    op.drop_index('idx_lessons_lang_level_topic', table_name='lessons')
    op.drop_table('lessons')
    op.drop_index(op.f('ix_languages_code'), table_name='languages')
    op.drop_table('languages')

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '5a95c230bd7d'
down_revision: Union[str, Sequence[str], None] = '3d652ad787b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('missions',
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('scenario_prompt', sa.Text(), nullable=False),
    sa.Column('related_goal', sa.Enum('travel', 'work', 'study', 'daily_life', 'exam_prep', name='mission_related_goal'), nullable=False),
    sa.Column('cefr_level_min', sa.Enum('A1', 'A2', 'B1', 'B2', 'C1', 'C2', name='cefr_level'), nullable=False),
    sa.Column('estimated_duration_minutes', sa.Integer(), nullable=False),
    sa.Column('difficulty_rating', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_missions'))
    )
    op.create_index(op.f('ix_missions_cefr_level_min'), 'missions', ['cefr_level_min'], unique=False)
    op.create_index(op.f('ix_missions_related_goal'), 'missions', ['related_goal'], unique=False)
    op.create_table('user_mission_attempts',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('mission_id', sa.UUID(), nullable=False),
    sa.Column('transcript', sa.JSON(), nullable=False),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.Column('score', sa.Float(), nullable=True),
    sa.Column('status', sa.Enum('in_progress', 'completed', 'abandoned', name='mission_attempt_status'), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['mission_id'], ['missions.id'], name=op.f('fk_user_mission_attempts_mission_id_missions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_mission_attempts_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_mission_attempts'))
    )
    op.create_index('idx_user_mission_attempts_user_mission', 'user_mission_attempts', ['user_id', 'mission_id'], unique=False)
    op.create_index(op.f('ix_user_mission_attempts_mission_id'), 'user_mission_attempts', ['mission_id'], unique=False)
    op.create_index(op.f('ix_user_mission_attempts_user_id'), 'user_mission_attempts', ['user_id'], unique=False)
    op.create_table('tutor_sessions',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('topic_context', sa.JSON(), nullable=True),
    sa.Column('active_lesson_id', sa.UUID(), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('message_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['active_lesson_id'], ['lessons.id'], name=op.f('fk_tutor_sessions_active_lesson_id_lessons'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_tutor_sessions_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tutor_sessions'))
    )
    op.create_index('idx_tutor_sessions_user_active', 'tutor_sessions', ['user_id', 'is_active'], unique=False)
    op.create_index(op.f('ix_tutor_sessions_is_active'), 'tutor_sessions', ['is_active'], unique=False)
    op.create_index(op.f('ix_tutor_sessions_user_id'), 'tutor_sessions', ['user_id'], unique=False)
    op.create_table('tutor_messages',
    sa.Column('session_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.Enum('user', 'assistant', name='tutor_message_role'), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('token_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('metadata', sa.JSON(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['tutor_sessions.id'], name=op.f('fk_tutor_messages_session_id_tutor_sessions'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tutor_messages'))
    )
    op.create_index('idx_tutor_messages_session_created', 'tutor_messages', ['session_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_tutor_messages_created_at'), 'tutor_messages', ['created_at'], unique=False)
    op.create_index(op.f('ix_tutor_messages_session_id'), 'tutor_messages', ['session_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_tutor_messages_session_id'), table_name='tutor_messages')
    op.drop_index(op.f('ix_tutor_messages_created_at'), table_name='tutor_messages')
    op.drop_index('idx_tutor_messages_session_created', table_name='tutor_messages')
    op.drop_table('tutor_messages')
    op.drop_index(op.f('ix_tutor_sessions_user_id'), table_name='tutor_sessions')
    op.drop_index(op.f('ix_tutor_sessions_is_active'), table_name='tutor_sessions')
    op.drop_index('idx_tutor_sessions_user_active', table_name='tutor_sessions')
    op.drop_table('tutor_sessions')
    op.drop_index(op.f('ix_user_mission_attempts_user_id'), table_name='user_mission_attempts')
    op.drop_index(op.f('ix_user_mission_attempts_mission_id'), table_name='user_mission_attempts')
    op.drop_index('idx_user_mission_attempts_user_mission', table_name='user_mission_attempts')
    op.drop_table('user_mission_attempts')
    op.drop_index(op.f('ix_missions_related_goal'), table_name='missions')
    op.drop_index(op.f('ix_missions_cefr_level_min'), table_name='missions')
    op.drop_table('missions')

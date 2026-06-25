from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '833d5a3a0fd4'
down_revision: Union[str, Sequence[str], None] = '43393638f7cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('achievements',
    sa.Column('code', sa.String(length=100), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('condition_type', sa.Enum('LESSONS_COMPLETED', 'STREAK_DAYS', 'WORDS_LEARNED', 'EXAMS_PASSED', 'SPEAKING_MINUTES', 'SPECIFIC_ACTION', name='condition_type'), nullable=False),
    sa.Column('condition_value', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_achievements'))
    )
    op.create_index(op.f('ix_achievements_code'), 'achievements', ['code'], unique=True)
    op.create_table('user_achievements',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('achievement_id', sa.UUID(), nullable=False),
    sa.Column('unlocked_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['achievement_id'], ['achievements.id'], name=op.f('fk_user_achievements_achievement_id_achievements'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_achievements_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_achievements')),
    sa.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievements_user_achievement')
    )
    op.create_index(op.f('ix_user_achievements_achievement_id'), 'user_achievements', ['achievement_id'], unique=False)
    op.create_index(op.f('ix_user_achievements_user_id'), 'user_achievements', ['user_id'], unique=False)
    op.create_table('user_gamification',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('total_xp', sa.Integer(), server_default='0', nullable=False),
    sa.Column('current_game_level', sa.Integer(), server_default='1', nullable=False),
    sa.Column('current_streak', sa.Integer(), server_default='0', nullable=False),
    sa.Column('longest_streak', sa.Integer(), server_default='0', nullable=False),
    sa.Column('last_activity_date', sa.Date(), nullable=True),
    sa.Column('has_unread_report', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('total_speaking_minutes', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_gamification_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', name=op.f('pk_user_gamification'))
    )
    op.create_table('user_quotas',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('function_name', sa.String(length=100), nullable=False),
    sa.Column('daily_limit', sa.Integer(), nullable=False),
    sa.Column('current_usage', sa.Integer(), server_default='0', nullable=False),
    sa.Column('last_reset_date', sa.Date(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_quotas_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_quotas')),
    sa.UniqueConstraint('user_id', 'function_name', name='uq_user_quotas_user_function')
    )
    op.create_index('idx_user_quotas_user_function', 'user_quotas', ['user_id', 'function_name'], unique=False)
    op.create_index('idx_user_quotas_user_id', 'user_quotas', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_quotas_user_id'), 'user_quotas', ['user_id'], unique=False)
    op.create_table('weekly_reports',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('period_start', sa.Date(), nullable=False),
    sa.Column('period_end', sa.Date(), nullable=False),
    sa.Column('strengths', sa.Text(), nullable=False),
    sa.Column('weaknesses', sa.Text(), nullable=False),
    sa.Column('recommendations', sa.Text(), nullable=False),
    sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_weekly_reports_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_weekly_reports')),
    sa.UniqueConstraint('user_id', 'period_start', name='uq_weekly_reports_user_period_start')
    )
    op.create_index('idx_weekly_reports_user_generated_at', 'weekly_reports', ['user_id', sa.literal_column('generated_at DESC')], unique=False)
    op.create_index(op.f('ix_weekly_reports_user_id'), 'weekly_reports', ['user_id'], unique=False)
    op.add_column('user_profiles', sa.Column('timezone', sa.String(length=50), server_default='UTC', nullable=False))

    import uuid
    ach_t = sa.table(
        'achievements',
        sa.column('id', sa.UUID),
        sa.column('code', sa.String),
        sa.column('title', sa.String),
        sa.column('description', sa.String),
        sa.column('condition_type', sa.String),
        sa.column('condition_value', sa.Integer)
    )
    achievements_data = [
        ("first_lesson", "First Steps", "Completed your first lesson!", "SPECIFIC_ACTION", 1),
        ("ten_lessons", "Getting Serious", "Completed 10 lessons!", "LESSONS_COMPLETED", 10),
        ("fifty_lessons", "Dedicated Learner", "Completed 50 lessons!", "LESSONS_COMPLETED", 50),
        ("hundred_lessons", "Language Master", "Completed 100 lessons!", "LESSONS_COMPLETED", 100),
        ("first_writing_exam", "Wordsmith", "Completed your first writing exam!", "SPECIFIC_ACTION", 1),
        ("first_listening_exam", "Attentive Listener", "Completed your first listening exam!", "SPECIFIC_ACTION", 1),
        ("hundred_words_learned", "Word Collector", "Learned 100 words!", "WORDS_LEARNED", 100),
        ("five_hundred_words_learned", "Vocab Builder", "Learned 500 words!", "WORDS_LEARNED", 500),
        ("three_day_streak", "Consistent", "Maintained a 3-day streak!", "STREAK_DAYS", 3),
        ("week_streak", "Unstoppable", "Maintained a 7-day streak!", "STREAK_DAYS", 7),
        ("month_streak", "Habitual", "Maintained a 30-day streak!", "STREAK_DAYS", 30),
        ("ten_exams_passed", "Exam Conqueror", "Passed 10 exams!", "EXAMS_PASSED", 10),
        ("fifty_min_speaking", "Chit-Chatter", "Accumulated 50 minutes of speaking!", "SPEAKING_MINUTES", 50),
        ("two_hundred_min_speaking", "Fluent Talker", "Accumulated 200 minutes of speaking!", "SPEAKING_MINUTES", 200),
        ("perfect_exam_score", "Perfectionist", "Achieved a perfect score on an exam!", "SPECIFIC_ACTION", 1)
    ]
    records = []
    for code, title, desc, ctype, val in achievements_data:
        records.append({
            "id": uuid.uuid5(uuid.NAMESPACE_DNS, f"linguist_ai.achievement.{code}"),
            "code": code,
            "title": title,
            "description": desc,
            "condition_type": ctype,
            "condition_value": val
        })
    op.bulk_insert(ach_t, records)

def downgrade() -> None:
    op.drop_column('user_profiles', 'timezone')
    op.drop_index(op.f('ix_weekly_reports_user_id'), table_name='weekly_reports')
    op.drop_index('idx_weekly_reports_user_generated_at', table_name='weekly_reports')
    op.drop_table('weekly_reports')
    op.drop_index(op.f('ix_user_quotas_user_id'), table_name='user_quotas')
    op.drop_index('idx_user_quotas_user_id', table_name='user_quotas')
    op.drop_index('idx_user_quotas_user_function', table_name='user_quotas')
    op.drop_table('user_quotas')
    op.drop_table('user_gamification')
    op.drop_index(op.f('ix_user_achievements_user_id'), table_name='user_achievements')
    op.drop_index(op.f('ix_user_achievements_achievement_id'), table_name='user_achievements')
    op.drop_table('user_achievements')
    op.drop_index(op.f('ix_achievements_code'), table_name='achievements')
    op.drop_table('achievements')

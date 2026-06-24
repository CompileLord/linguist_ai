from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c8be3d7d78fb'
down_revision: Union[str, Sequence[str], None] = '5a95c230bd7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('user_daily_usages',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('activity_date', sa.Date(), nullable=False),
    sa.Column('message_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_daily_usages_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_daily_usages')),
    sa.UniqueConstraint('user_id', 'activity_date', name='uq_user_daily_usages_user_date')
    )
    op.create_index(op.f('ix_user_daily_usages_user_id'), 'user_daily_usages', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_user_daily_usages_user_id'), table_name='user_daily_usages')
    op.drop_table('user_daily_usages')

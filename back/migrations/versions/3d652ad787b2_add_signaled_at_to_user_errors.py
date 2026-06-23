from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '3d652ad787b2'
down_revision: Union[str, Sequence[str], None] = '3b232c23952b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('user_errors', sa.Column('signaled_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column('user_errors', 'signaled_at')


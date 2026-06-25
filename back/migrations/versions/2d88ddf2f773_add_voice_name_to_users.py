from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '2d88ddf2f773'
down_revision: Union[str, Sequence[str], None] = '833d5a3a0fd4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('voice_name', sa.String(length=50), server_default='hfc_female', nullable=False))

def downgrade() -> None:
    op.drop_column('users', 'voice_name')

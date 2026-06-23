from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '3b232c23952b'
down_revision: Union[str, Sequence[str], None] = 'ac3894a2a698'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('spaced_repetition_items', sa.Column('repetition_number', sa.Integer(), server_default='0', nullable=False))

def downgrade() -> None:
    op.drop_column('spaced_repetition_items', 'repetition_number')


from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa

revision: str = 'cd9c489eaa5e'
down_revision: Union[str, Sequence[str], None] = 'f2e2f2e2a4be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    languages = [
        {"id": uuid.uuid4().hex, "code": "en", "name": "English", "native_name": "English", "is_active": True},
        {"id": uuid.uuid4().hex, "code": "es", "name": "Spanish", "native_name": "Español", "is_active": False},
        {"id": uuid.uuid4().hex, "code": "fr", "name": "French", "native_name": "Français", "is_active": False},
        {"id": uuid.uuid4().hex, "code": "de", "name": "German", "native_name": "Deutsch", "is_active": False},
        {"id": uuid.uuid4().hex, "code": "ja", "name": "Japanese", "native_name": "日本語", "is_active": False}
    ]
    for lang in languages:
        op.execute(
            sa.text(
                "INSERT INTO languages (id, code, name, native_name, is_active, created_at, updated_at) "
                "VALUES (:id, :code, :name, :native_name, :is_active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) "
                "ON CONFLICT(code) DO NOTHING"
            ).bindparams(**lang)
        )

def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM languages WHERE code IN ('en', 'es', 'fr', 'de', 'ja')")
    )

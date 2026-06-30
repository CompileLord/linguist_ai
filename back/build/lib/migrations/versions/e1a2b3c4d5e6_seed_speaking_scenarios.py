from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '2d88ddf2f773'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'speaking_scenarios',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('icon', sa.String(length=100), nullable=False),
        sa.Column('cefr_level', sa.String(length=2), nullable=False),
        sa.Column('character_name', sa.String(length=100), nullable=False),
        sa.Column('character_role', sa.String(length=255), nullable=False),
        sa.Column('scene', sa.Text(), nullable=False),
        sa.Column('prompt_context', sa.Text(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_speaking_scenarios')),
    )
    op.create_index(op.f('ix_speaking_scenarios_cefr_level'), 'speaking_scenarios', ['cefr_level'], unique=False)

    scenarios_table = sa.table(
        'speaking_scenarios',
        sa.column('id', sa.UUID),
        sa.column('title', sa.String),
        sa.column('description', sa.String),
        sa.column('icon', sa.String),
        sa.column('cefr_level', sa.String),
        sa.column('character_name', sa.String),
        sa.column('character_role', sa.String),
        sa.column('scene', sa.String),
        sa.column('prompt_context', sa.String),
        sa.column('sort_order', sa.Integer),
    )

    op.bulk_insert(
        scenarios_table,
        [
            {
                "id": uuid.UUID("a1000001-0000-4000-a000-000000000001"),
                "title": "First Meeting",
                "description": "Say hello and learn about someone new",
                "icon": "waving_hand",
                "cefr_level": "A1",
                "character_name": "Sam",
                "character_role": "a friendly local you just met at a community board",
                "scene": "You're both looking at a community notice board in your neighbourhood",
                "prompt_context": "Speak simple English. Ask the user their name and where they are from. React warmly but naturally — no over-praising.",
                "sort_order": 1,
            },
            {
                "id": uuid.UUID("a1000001-0000-4000-a000-000000000002"),
                "title": "Cafe Order",
                "description": "Practice ordering drinks and snacks",
                "icon": "local_cafe",
                "cefr_level": "A1",
                "character_name": "Maya",
                "character_role": "a cheerful barista at The Bean Corner café",
                "scene": "The user walks up to the café counter to order",
                "prompt_context": "You are Maya, the barista. Greet the customer, ask what they want, repeat their order, tell them the price (make one up), and ask if they want it to go or to stay. Keep sentences very short.",
                "sort_order": 2,
            },
            {
                "id": uuid.UUID("a2000002-0000-4000-a000-000000000001"),
                "title": "New Neighbor",
                "description": "Chat with the person who just moved in",
                "icon": "home",
                "cefr_level": "A2",
                "character_name": "Alex",
                "character_role": "your new neighbour who just moved into the flat next door",
                "scene": "You both meet in the hallway of your apartment building",
                "prompt_context": "You are Alex. You knocked to introduce yourself. Talk about the building, the area, and invite them to grab coffee sometime.",
                "sort_order": 1,
            },
            {
                "id": uuid.UUID("a2000002-0000-4000-a000-000000000002"),
                "title": "At the Pharmacy",
                "description": "Ask for advice about a common illness",
                "icon": "local_pharmacy",
                "cefr_level": "A2",
                "character_name": "Daniel",
                "character_role": "a helpful pharmacist",
                "scene": "The user walks into a pharmacy with cold symptoms",
                "prompt_context": "You are Daniel the pharmacist. Ask what symptoms the user has, recommend a product, and give simple usage instructions.",
                "sort_order": 2,
            },
            {
                "id": uuid.UUID("b1000001-0000-4000-b000-000000000001"),
                "title": "Helping a Tourist",
                "description": "A visitor asks you for directions",
                "icon": "explore",
                "cefr_level": "B1",
                "character_name": "Mia",
                "character_role": "a tourist who is lost and needs help",
                "scene": "You are on a busy city street when a tourist approaches",
                "prompt_context": "You are Mia, a friendly tourist. You are looking for the nearest museum. Ask for directions, react to the instructions, and make small talk.",
                "sort_order": 1,
            },
            {
                "id": uuid.UUID("b1000001-0000-4000-b000-000000000002"),
                "title": "Recruiter Call",
                "description": "A recruiter calls about a job opening",
                "icon": "work",
                "cefr_level": "B1",
                "character_name": "Jordan",
                "character_role": "a recruiter who found your CV online",
                "scene": "The user just answered an unexpected phone call from a recruiter",
                "prompt_context": "You are Jordan from a tech company. Briefly explain the role, ask two or three screening questions, and ask about availability.",
                "sort_order": 2,
            },
            {
                "id": uuid.UUID("b2000002-0000-4000-b000-000000000001"),
                "title": "Apartment Viewing",
                "description": "Negotiate with a landlord about a flat",
                "icon": "apartment",
                "cefr_level": "B2",
                "character_name": "Rachel",
                "character_role": "a landlord showing a flat",
                "scene": "The user is viewing a flat that is slightly above their budget",
                "prompt_context": "You are Rachel the landlord. Give a tour verbally, highlight pros, and handle the user's questions about price, terms, and neighbours.",
                "sort_order": 1,
            },
            {
                "id": uuid.UUID("b2000002-0000-4000-b000-000000000002"),
                "title": "Team Conflict",
                "description": "Resolve a disagreement with a coworker",
                "icon": "groups",
                "cefr_level": "B2",
                "character_name": "Chris",
                "character_role": "a coworker who disagrees with you on a project approach",
                "scene": "You are both in a work meeting discussing a project deadline",
                "prompt_context": "You are Chris. You think the deadline is too tight and want to push back. Be firm but professional; look for compromise.",
                "sort_order": 2,
            },
            {
                "id": uuid.UUID("c1000001-0000-4000-c000-000000000001"),
                "title": "Salary Negotiation",
                "description": "Negotiate a job offer with a hiring manager",
                "icon": "trending_up",
                "cefr_level": "C1",
                "character_name": "Ms. Park",
                "character_role": "a hiring manager making you a job offer",
                "scene": "You just received a job offer that is 10% below your expectation",
                "prompt_context": "You are Ms. Park. Present a reasonable offer, listen to the counter-offer, and negotiate — you have some flexibility but not unlimited.",
                "sort_order": 1,
            },
            {
                "id": uuid.UUID("c1000001-0000-4000-c000-000000000002"),
                "title": "Press Interview",
                "description": "Answer questions from a journalist",
                "icon": "mic",
                "cefr_level": "C1",
                "character_name": "Tom",
                "character_role": "a journalist interviewing you about your field",
                "scene": "A journalist is doing a feature article on AI in education",
                "prompt_context": "You are Tom the journalist. Ask probing follow-up questions, challenge vague answers politely, and push for specifics.",
                "sort_order": 2,
            },
            {
                "id": uuid.UUID("c2000002-0000-4000-c000-000000000001"),
                "title": "Thesis Defence",
                "description": "Defend your research to a critical professor",
                "icon": "school",
                "cefr_level": "C2",
                "character_name": "Prof. Chen",
                "character_role": "a sharp but fair academic examining your thesis",
                "scene": "You are presenting the conclusion of your research paper",
                "prompt_context": "You are Prof. Chen. Ask deep, challenging questions about methodology and conclusions. Be sceptical but fair.",
                "sort_order": 1,
            },
            {
                "id": uuid.UUID("c2000002-0000-4000-c000-000000000002"),
                "title": "Policy Debate",
                "description": "Argue for a policy change with a sceptic",
                "icon": "gavel",
                "cefr_level": "C2",
                "character_name": "Commissioner Hayes",
                "character_role": "a sceptical city commissioner",
                "scene": "You are pitching a bold policy proposal to a city council member",
                "prompt_context": "You are Commissioner Hayes. You are sceptical of the proposal. Ask hard questions about cost, feasibility, and unintended consequences.",
                "sort_order": 2,
            },
        ]
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_speaking_scenarios_cefr_level'), table_name='speaking_scenarios')
    op.drop_table('speaking_scenarios')

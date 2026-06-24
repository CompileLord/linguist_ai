from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'afa4f6d55fd0'
down_revision: Union[str, Sequence[str], None] = 'c8be3d7d78fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

import uuid

def upgrade() -> None:
    missions_table = sa.table(
        'missions',
        sa.column('id', sa.UUID),
        sa.column('title', sa.String),
        sa.column('description', sa.String),
        sa.column('scenario_prompt', sa.String),
        sa.column('related_goal', sa.String),
        sa.column('cefr_level_min', sa.String),
        sa.column('estimated_duration_minutes', sa.Integer),
        sa.column('difficulty_rating', sa.Integer),
        sa.column('is_active', sa.Boolean)
    )

    op.bulk_insert(
        missions_table,
        [
            {
                "id": uuid.UUID("a1111111-1111-4111-a111-111111111111"),
                "title": "Order Dinner at a Restaurant",
                "description": "Practice ordering a meal and drinks from a waiter at an Italian restaurant.",
                "scenario_prompt": "You are a friendly waiter at 'Luigi's Bistro', a local Italian restaurant. The user is a customer looking to order dinner. Greet them warmly and assist them with ordering a main course and a beverage. Respond with short, simple sentences suitable for an A1 level student. Ask if they want dessert or have any dietary preferences.",
                "related_goal": "travel",
                "cefr_level_min": "A1",
                "estimated_duration_minutes": 10,
                "difficulty_rating": 1,
                "is_active": True
            },
            {
                "id": uuid.UUID("a2222222-2222-4222-a222-222222222222"),
                "title": "Book a Hotel Room",
                "description": "Book a room at a hotel front desk, specifying dates and preferences.",
                "scenario_prompt": "You are the receptionist at the 'Grand Horizon Hotel'. The user wants to book a room for their upcoming vacation. Ask them for their arrival date, the number of nights, room type preference (single/double), and any special requirements. Speak in clear, simple English appropriate for an A2 student.",
                "related_goal": "travel",
                "cefr_level_min": "A2",
                "estimated_duration_minutes": 12,
                "difficulty_rating": 2,
                "is_active": True
            },
            {
                "id": uuid.UUID("a3333333-3333-4333-a333-333333333333"),
                "title": "Ask for Directions in London",
                "description": "Find your way to a landmark by asking a helpful local resident.",
                "scenario_prompt": "You are a polite local resident walking near Westminster in London. The user is a lost tourist trying to find Westminster Abbey. Give them step-by-step directions, including landmarks and turns. Check if they understand and guide them kindly using B1 level English.",
                "related_goal": "travel",
                "cefr_level_min": "B1",
                "estimated_duration_minutes": 15,
                "difficulty_rating": 3,
                "is_active": True
            },
            {
                "id": uuid.UUID("b1111111-1111-4111-b111-111111111111"),
                "title": "Job Interview: Software Developer",
                "description": "Answer technical and behavioral questions for a software engineering role.",
                "scenario_prompt": "You are a tech lead and hiring manager at a growing startup. You are interviewing the user for a Software Developer role. Ask them to introduce themselves, describe a project they built using Python, how they handle work stress, and why they want to join your company. Use professional business B2 level English.",
                "related_goal": "work",
                "cefr_level_min": "B2",
                "estimated_duration_minutes": 20,
                "difficulty_rating": 4,
                "is_active": True
            },
            {
                "id": uuid.UUID("b2222222-2222-4222-b222-222222222222"),
                "title": "Present a Project Proposal",
                "description": "Pitch a new project proposal to a demanding senior executive.",
                "scenario_prompt": "You are the Chief Financial Officer (CFO) of a multinational corporation. The user is a project manager pitching a new digital transformation project. Ask difficult, analytical questions about project costs, return on investment, risks, timeline, and resource allocation. Use complex, formal C1 level business English.",
                "related_goal": "work",
                "cefr_level_min": "C1",
                "estimated_duration_minutes": 25,
                "difficulty_rating": 5,
                "is_active": True
            },
            {
                "id": uuid.UUID("b3333333-3333-4333-b333-333333333333"),
                "title": "Negotiate a Business Contract",
                "description": "Negotiate contract pricing and delivery terms with a supplier.",
                "scenario_prompt": "You are a supplier of wholesale electronics. The user represents a retail chain wanting to buy your products. Discuss order volume, bulk discounts, delivery timelines, payment terms, and penalties for delays. Negotiate firmly but professionally using B2 level English.",
                "related_goal": "work",
                "cefr_level_min": "B2",
                "estimated_duration_minutes": 18,
                "difficulty_rating": 4,
                "is_active": True
            },
            {
                "id": uuid.UUID("c1111111-1111-4111-c111-111111111111"),
                "title": "Discuss Study Abroad Plans",
                "description": "Consult with a university advisor about study abroad options and requirements.",
                "scenario_prompt": "You are an academic advisor at the University international office. The user is a student interested in spending a semester abroad. Talk to them about exchange partner universities, course credit transfer, visa applications, and campus housing. Speak clearly using academic B1 level English.",
                "related_goal": "study",
                "cefr_level_min": "B1",
                "estimated_duration_minutes": 15,
                "difficulty_rating": 3,
                "is_active": True
            },
            {
                "id": uuid.UUID("c2222222-2222-4222-c222-222222222222"),
                "title": "Library Book Inquiry",
                "description": "Ask a librarian for assistance in finding research materials.",
                "scenario_prompt": "You are a helpful librarian at a university library. The user is a student looking for sources for their history project. Help them search the digital library catalog, suggest relevant book shelves, and explain borrowing rules and library card setup. Use simple A2 level English.",
                "related_goal": "study",
                "cefr_level_min": "A2",
                "estimated_duration_minutes": 10,
                "difficulty_rating": 2,
                "is_active": True
            },
            {
                "id": uuid.UUID("d1111111-1111-4111-d111-111111111111"),
                "title": "Meet a New Neighbor",
                "description": "Introduce yourself to a neighbor who has just moved in next door.",
                "scenario_prompt": "You are a friendly neighbor who recently moved into the apartment next door. You run into the user in the hallway. Introduce yourself, ask about the local neighborhood, good supermarkets, and local transport. Keep your responses short and simple, suited for an A1 level student.",
                "related_goal": "daily_life",
                "cefr_level_min": "A1",
                "estimated_duration_minutes": 10,
                "difficulty_rating": 1,
                "is_active": True
            },
            {
                "id": uuid.UUID("d2222222-2222-4222-d222-222222222222"),
                "title": "Report a Lost Item at the Gym",
                "description": "Report a lost personal item to the gym reception desk.",
                "scenario_prompt": "You work at the reception desk of 'Active Life Fitness'. The user has lost a valuable personal item (keys or phone) in the gym. Ask them where they last had it, what it looks like, and fill out a lost-and-found report form. Communicate using clear, basic A2 level English.",
                "related_goal": "daily_life",
                "cefr_level_min": "A2",
                "estimated_duration_minutes": 12,
                "difficulty_rating": 2,
                "is_active": True
            },
            {
                "id": uuid.UUID("e1111111-1111-4111-e111-111111111111"),
                "title": "IELTS Speaking Task: Describe a Hobby",
                "description": "Practice IELTS Speaking Part 2 by talking about your favorite hobby.",
                "scenario_prompt": "You are an official IELTS examiner. Greet the user, ask them to talk about their favorite hobby, how they started it, how often they practice, and why they like it. Ask brief follow-up questions to assess their fluency and coherence. Maintain standard IELTS examination B1 level English.",
                "related_goal": "exam_prep",
                "cefr_level_min": "B1",
                "estimated_duration_minutes": 15,
                "difficulty_rating": 3,
                "is_active": True
            },
            {
                "id": uuid.UUID("e2222222-2222-4222-e222-222222222222"),
                "title": "TOEFL Speaking Task: Campus Policy",
                "description": "Give your opinion on a controversial new campus policy.",
                "scenario_prompt": "You are a TOEFL speaking assessor. Ask the user's opinion on a proposed university policy to ban all motorized vehicles from the campus center to make it pedestrian-only. Instruct them to state their opinion clearly and provide two supporting reasons. Use standard academic B2 level English.",
                "related_goal": "exam_prep",
                "cefr_level_min": "B2",
                "estimated_duration_minutes": 15,
                "difficulty_rating": 4,
                "is_active": True
            }
        ]
    )

def downgrade() -> None:
    op.execute(
        "DELETE FROM missions WHERE title IN ("
        "'Order Dinner at a Restaurant', "
        "'Book a Hotel Room', "
        "'Ask for Directions in London', "
        "'Job Interview: Software Developer', "
        "'Present a Project Proposal', "
        "'Negotiate a Business Contract', "
        "'Discuss Study Abroad Plans', "
        "'Library Book Inquiry', "
        "'Meet a New Neighbor', "
        "'Report a Lost Item at the Gym', "
        "'IELTS Speaking Task: Describe a Hobby', "
        "'TOEFL Speaking Task: Campus Policy'"
        ")"
    )


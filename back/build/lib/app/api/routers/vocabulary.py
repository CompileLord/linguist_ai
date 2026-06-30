import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from app.models.user import User
from app.models.enums import CEFRLevel
from app.schemas.vocabulary import (
    VocabularyCreate,
    VocabularyResponse,
    UserVocabularyResponse,
    ReviewOutcome,
    PaginatedVocabularyResponse,
    PaginatedUserVocabularyResponse
)
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_vocabulary_service,
    get_vocabulary_repository,
    get_user_vocabulary_repository
)
from app.services.vocabulary_service import VocabularyService
from app.repositories.vocabulary_repository import VocabularyRepository
from app.repositories.user_vocabulary_repository import UserVocabularyRepository
from app.core.exceptions import VocabularyNotFoundError

router = APIRouter(prefix="/vocabulary", tags=["Vocabulary"])

@router.post("", response_model=UserVocabularyResponse, status_code=status.HTTP_201_CREATED)
async def add_vocabulary_word(
    vocab_in: VocabularyCreate,
    current_user: User = Depends(get_current_active_user),
    vocab_service: VocabularyService = Depends(get_vocabulary_service)
):
    user_vocab = await vocab_service.add_word_for_user(current_user.id, vocab_in)
    return UserVocabularyResponse.model_validate(user_vocab)

@router.get("", response_model=PaginatedVocabularyResponse, status_code=status.HTTP_200_OK)
async def list_vocabulary(
    language_id: uuid.UUID,
    cefr_level: Optional[CEFRLevel] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    vocab_repo: VocabularyRepository = Depends(get_vocabulary_repository)
):
    skip = (page - 1) * per_page
    if search:
        items = await vocab_repo.search_by_prefix(language_id, search, limit=per_page)
        total = len(items)
    elif cefr_level:
        items = await vocab_repo.list_by_cefr_level(language_id, cefr_level, skip=skip, limit=per_page)
        from sqlalchemy import select, func
        from app.models.vocabulary import Vocabulary
        from app.core.database import db_manager
        async with db_manager.get_session() as session:
            result = await session.execute(
                select(func.count(Vocabulary.id)).filter(
                    Vocabulary.language_id == language_id,
                    Vocabulary.cefr_level == cefr_level
                )
            )
            total = result.scalar() or 0
    else:
        items = await vocab_repo.list_by_language(language_id, skip=skip, limit=per_page)
        from sqlalchemy import select, func
        from app.models.vocabulary import Vocabulary
        from app.core.database import db_manager
        async with db_manager.get_session() as session:
            result = await session.execute(
                select(func.count(Vocabulary.id)).filter(Vocabulary.language_id == language_id)
            )
            total = result.scalar() or 0

    return PaginatedVocabularyResponse(
        items=[VocabularyResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/user", response_model=PaginatedUserVocabularyResponse, status_code=status.HTTP_200_OK)
async def list_user_vocabulary(
    is_known: Optional[bool] = None,
    sort_by: Optional[str] = Query(None, description="Options: last_reviewed_at, errors_count, repetitions_count"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    vocab_service: VocabularyService = Depends(get_vocabulary_service)
):
    skip = (page - 1) * per_page
    items, total = await vocab_service.get_user_vocabulary(
        user_id=current_user.id,
        is_known=is_known,
        skip=skip,
        limit=per_page,
        sort_by=sort_by
    )

    return PaginatedUserVocabularyResponse(
        items=[UserVocabularyResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        per_page=per_page
    )

@router.post("/{vocabulary_id}/audio", status_code=status.HTTP_200_OK)
async def generate_audio(
    vocabulary_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    vocab_service: VocabularyService = Depends(get_vocabulary_service)
):
    audio_url = await vocab_service.ensure_audio(vocabulary_id)
    return {"audio_url": audio_url}

@router.post("/{vocabulary_id}/review", response_model=UserVocabularyResponse, status_code=status.HTTP_200_OK)
async def review_vocabulary_word(
    vocabulary_id: uuid.UUID,
    outcome: ReviewOutcome,
    current_user: User = Depends(get_current_active_user),
    vocab_service: VocabularyService = Depends(get_vocabulary_service)
):
    user_vocab = await vocab_service.record_review(
        user_id=current_user.id,
        vocabulary_id=vocabulary_id,
        outcome=outcome
    )
    return UserVocabularyResponse.model_validate(user_vocab)

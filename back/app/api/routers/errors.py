import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from app.models.user import User
from app.models.enums import ErrorCategory
from app.schemas.user_error import UserErrorResponse, ErrorSummaryResponse, PaginatedUserErrorResponse
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import get_user_error_repository
from app.repositories.user_error_repository import UserErrorRepository
from app.core.database import db_manager
from app.models.user_error import UserError

router = APIRouter(prefix="/errors", tags=["Errors"])

@router.get("", response_model=PaginatedUserErrorResponse, status_code=status.HTTP_200_OK)
async def list_user_errors(
    category: Optional[ErrorCategory] = None,
    sort_by: str = Query("recent", description="Options: recent, frequent"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    user_error_repo: UserErrorRepository = Depends(get_user_error_repository)
):
    skip = (page - 1) * per_page
    items = await user_error_repo.list_by_user(
        user_id=current_user.id,
        category=category,
        skip=skip,
        limit=per_page,
        sort_by=sort_by
    )

    async with db_manager.get_session() as session:
        query = select(func.count(UserError.id)).filter(UserError.user_id == current_user.id)
        if category is not None:
            query = query.filter(UserError.category == category)
        result = await session.execute(query)
        total = result.scalar() or 0

    return PaginatedUserErrorResponse(
        items=[UserErrorResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/frequent", response_model=List[UserErrorResponse], status_code=status.HTTP_200_OK)
async def list_frequent_user_errors(
    min_count: int = Query(3, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    user_error_repo: UserErrorRepository = Depends(get_user_error_repository)
):
    items = await user_error_repo.list_frequent(
        user_id=current_user.id,
        min_occurrence_count=min_count,
        limit=limit
    )
    return [UserErrorResponse.model_validate(item) for item in items]

@router.get("/summary", response_model=ErrorSummaryResponse, status_code=status.HTTP_200_OK)
async def get_user_error_summary(
    current_user: User = Depends(get_current_active_user),
    user_error_repo: UserErrorRepository = Depends(get_user_error_repository)
):
    summary = await user_error_repo.get_error_summary(current_user.id)
    return ErrorSummaryResponse(
        total_errors=summary["total_errors"],
        grammar_errors=summary["grammar_errors"],
        vocabulary_errors=summary["vocabulary_errors"],
        most_common_error_text=summary["most_common_error_text"]
    )

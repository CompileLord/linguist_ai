from abc import ABC
from typing import Generic, TypeVar

RepositoryType = TypeVar("RepositoryType")

class AbstractService(ABC, Generic[RepositoryType]):
    def __init__(self, repository: RepositoryType) -> None:
        self._repository = repository

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.database.session import get_db

__all__ = ["get_db_session"]


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()

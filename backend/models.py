from sqlalchemy import Boolean, Column, String

from .db import Base
from .security import EncryptedString


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, index=True, nullable=False, default="legacy")
    title = Column(EncryptedString(), nullable=False)
    start = Column(EncryptedString(), nullable=False)
    end = Column(EncryptedString(), nullable=False)
    icon = Column(EncryptedString(), nullable=False)
    color = Column(EncryptedString(), nullable=False)
    day_id = Column(EncryptedString(), nullable=False)
    done = Column(Boolean, default=False, nullable=False)
    notes = Column(EncryptedString(), default="", nullable=True)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(EncryptedString(), nullable=False)

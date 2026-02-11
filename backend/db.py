import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
ENV_DB_PATH = os.getenv("DATABASE_PATH")
if ENV_DB_PATH:
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{ENV_DB_PATH}"
elif os.getenv("VERCEL"):
    SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/scheduler.db"
else:
    DB_PATH = BASE_DIR / "scheduler.db"
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_updates() -> None:
    with engine.begin() as conn:
        task_columns = conn.execute(text("PRAGMA table_info(tasks)")).fetchall()
        task_column_names = {row[1] for row in task_columns}
        if "owner_id" not in task_column_names:
            conn.execute(
                text(
                    "ALTER TABLE tasks ADD COLUMN owner_id VARCHAR NOT NULL DEFAULT 'legacy'"
                )
            )
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_tasks_owner_id ON tasks (owner_id)")
            )

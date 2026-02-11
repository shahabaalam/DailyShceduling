from typing import Optional

from sqlalchemy.orm import Session

from . import models, schemas


def get_tasks(db: Session, owner_id: str):
    return db.query(models.Task).filter(models.Task.owner_id == owner_id).all()


def get_task(db: Session, task_id: str, owner_id: str) -> Optional[models.Task]:
    return (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.owner_id == owner_id)
        .first()
    )


def upsert_task(db: Session, task_in: schemas.TaskIn, owner_id: str) -> models.Task:
    day_id = task_in.day_id or task_in.dayId
    if not day_id:
        raise ValueError("day_id is required")

    task_id = task_in.id
    task = get_task(db, task_id, owner_id) if task_id else None
    id_taken_by_other_user = False
    if task_id and not task:
        id_taken_by_other_user = (
            db.query(models.Task).filter(models.Task.id == task_id).first() is not None
        )

    if task:
        task.title = task_in.title
        task.start = task_in.start
        task.end = task_in.end
        task.icon = task_in.icon
        task.color = task_in.color
        task.day_id = day_id
        task.done = bool(task_in.done)
        task.notes = task_in.notes or ""
    else:
        task = models.Task(
            id=_make_id() if id_taken_by_other_user else (task_id or _make_id()),
            owner_id=owner_id,
            title=task_in.title,
            start=task_in.start,
            end=task_in.end,
            icon=task_in.icon,
            color=task_in.color,
            day_id=day_id,
            done=bool(task_in.done),
            notes=task_in.notes or "",
        )
        db.add(task)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: str, owner_id: str) -> bool:
    task = get_task(db, task_id, owner_id)
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True


def get_setting(db: Session, key: str) -> Optional[models.Setting]:
    return db.query(models.Setting).filter(models.Setting.key == key).first()


def upsert_setting(db: Session, setting_in: schemas.SettingIn) -> models.Setting:
    setting = get_setting(db, setting_in.key)
    if setting:
        setting.value = setting_in.value
    else:
        setting = models.Setting(key=setting_in.key, value=setting_in.value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def clear_all(db: Session) -> None:
    db.query(models.Task).delete()
    db.query(models.Setting).delete()
    db.commit()


def ensure_rows_encrypted(db: Session) -> None:
    # Reassigning values forces SQLAlchemy bind processing,
    # which encrypts legacy plaintext rows via EncryptedString.
    for task in db.query(models.Task).all():
        task.owner_id = task.owner_id or "legacy"
        task.title = task.title
        task.start = task.start
        task.end = task.end
        task.icon = task.icon
        task.color = task.color
        task.day_id = task.day_id
        task.notes = task.notes or ""

    for setting in db.query(models.Setting).all():
        setting.value = setting.value

    db.commit()


def _make_id() -> str:
    from uuid import uuid4

    return uuid4().hex

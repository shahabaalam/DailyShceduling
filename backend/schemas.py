from typing import Optional

from pydantic import BaseModel, ConfigDict


class TaskIn(BaseModel):
    id: Optional[str] = None
    title: str
    start: str
    end: str
    icon: str
    color: str
    done: bool = False
    notes: Optional[str] = ""
    day_id: Optional[str] = None
    dayId: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class TaskOut(BaseModel):
    id: str
    title: str
    start: str
    end: str
    icon: str
    color: str
    done: bool
    notes: Optional[str] = ""
    day_id: str

    model_config = ConfigDict(from_attributes=True)


class SettingIn(BaseModel):
    key: str
    value: str


class SettingOut(BaseModel):
    key: str
    value: str

    model_config = ConfigDict(from_attributes=True)

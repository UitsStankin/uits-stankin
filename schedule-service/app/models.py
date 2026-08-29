from pydantic import BaseModel, Field

DATE_PATTERN = r"^\d{2}\.\d{2}$"


class DatePeriod(BaseModel):
    start: str = Field(pattern=DATE_PATTERN)
    end: str = Field(pattern=DATE_PATTERN)
    every_other_week: bool


class Lesson(BaseModel):
    week_day: int = Field(ge=1, le=6)
    class_time: int = Field(ge=1, le=8)
    group: str = Field(min_length=1)
    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    subgroup: str | None = Field(default=None, pattern=r"^[А-ЯЁA-Z]$")
    cabinet: str | None = Field(default=None, min_length=1)
    dates: list[DatePeriod] = Field(min_length=1)


class ParsedSchedule(BaseModel):
    lessons: list[Lesson]

from pydantic import BaseModel, Field

DATE_PATTERN = r"^\d{2}\.\d{2}$"
ISO_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"
TIME_PATTERN = r"^\d{2}:\d{2}$"


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


class Consultation(BaseModel):
    date: str = Field(pattern=ISO_DATE_PATTERN)
    time: str = Field(pattern=TIME_PATTERN)
    cabinet: str = Field(min_length=1)


class Exam(BaseModel):
    date: str = Field(pattern=ISO_DATE_PATTERN)
    week_day: int = Field(ge=1, le=6)
    time_start: str = Field(pattern=TIME_PATTERN)
    time_end: str = Field(pattern=TIME_PATTERN)
    cabinet: str = Field(min_length=1)
    group: str = Field(min_length=1)
    name: str = Field(min_length=1)
    consultation: Consultation | None = None


class ParsedExams(BaseModel):
    exams: list[Exam]

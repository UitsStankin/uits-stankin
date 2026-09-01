import io
import re
from datetime import date, time
from typing import BinaryIO

import pdfplumber
from pydantic import ValidationError

from app.errors import ScheduleParseError
from app.models import Consultation, Exam, ParsedExams
from app.parser import DAYS, GROUP_RE

CONSULTATION_RE = re.compile(
    r"^консультация:\s*(\d{2}\.\d{2}\.\d{4})\s+(\d{1,2}:\d{2})\s+ауд\.\s*(\S+)$"
)
EXAM_HEAD_RE = re.compile(
    r"^(\d{2}\.\d{2}\.\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+"
    r"ауд\.\s*(\S+)\s+(\S+(?:,\s*\S+)*)$"
)
EXAM_TAIL_RE = re.compile(r"^([А-ЯЁ][а-яё]+)\s+(.+)$")


def parse_exams(source: bytes | BinaryIO) -> ParsedExams:
    if isinstance(source, bytes):
        source = io.BytesIO(source)
    try:
        pdf = pdfplumber.open(source)
    except Exception as e:
        raise ScheduleParseError("файл не удалось прочитать как PDF") from e
    lines: list[str] = []
    try:
        with pdf:
            for page in pdf.pages:
                for table in page.find_tables():
                    lines.extend(_table_lines(page, table))
    except Exception as e:
        raise ScheduleParseError("не удалось извлечь таблицы из PDF") from e
    if not lines:
        raise ScheduleParseError("в PDF не найдено ни одной таблицы экзаменов")
    try:
        return ParsedExams(exams=_parse_lines(lines))
    except ValidationError as e:
        raise ScheduleParseError(f"результат разбора не прошёл валидацию схемы: {e}") from e


def _table_lines(page: pdfplumber.page.Page, table) -> list[str]:
    left, top, _, bottom = table.bbox
    band = page.filter(lambda obj: top <= obj["top"] <= bottom and obj["x0"] >= left)
    text = band.extract_text() or ""
    return [line for raw in text.split("\n") if (line := _normalize(raw))]


def _parse_lines(lines: list[str]) -> list[Exam]:
    exams: list[Exam] = []
    consultation: Consultation | None = None
    index = 0
    while index < len(lines):
        line = lines[index]
        pending = CONSULTATION_RE.match(line)
        if pending:
            if consultation is not None:
                raise ScheduleParseError(
                    f"две консультации подряд, между ними нет экзамена: '{line}'"
                )
            consultation = _parse_consultation(pending)
            index += 1
            continue
        head = EXAM_HEAD_RE.match(line)
        if not head:
            raise ScheduleParseError(
                f"строка не похожа ни на консультацию, ни на первую строку экзамена: '{line}'"
            )
        if index + 1 >= len(lines):
            raise ScheduleParseError(
                f"у экзамена '{line}' нет второй строки с днём недели и дисциплиной"
            )
        tail = EXAM_TAIL_RE.match(lines[index + 1])
        if not tail:
            raise ScheduleParseError(
                f"вторая строка экзамена не похожа на день недели и дисциплину: "
                f"'{lines[index + 1]}'"
            )
        exams.append(_parse_exam(head, tail, consultation))
        consultation = None
        index += 2
    if consultation is not None:
        raise ScheduleParseError("последняя консультация осталась без экзамена")
    if not exams:
        raise ScheduleParseError("в таблице не нашлось ни одного экзамена")
    return exams


def _parse_consultation(match: re.Match[str]) -> Consultation:
    return Consultation(
        date=_parse_date(match.group(1)).isoformat(),
        time=_parse_time(match.group(2)),
        cabinet=match.group(3),
    )


def _parse_exam(
    head: re.Match[str], tail: re.Match[str], consultation: Consultation | None
) -> Exam:
    exam_date = _parse_date(head.group(1))
    time_start = _parse_time(head.group(2))
    time_end = _parse_time(head.group(3))
    if time_end <= time_start:
        raise ScheduleParseError(
            f"экзамен заканчивается не позже, чем начинается: '{time_start} - {time_end}'"
        )
    group = _parse_groups(head.group(5))
    return Exam(
        date=exam_date.isoformat(),
        week_day=_parse_week_day(tail.group(1), exam_date),
        time_start=time_start,
        time_end=time_end,
        cabinet=head.group(4),
        group=group,
        name=tail.group(2).strip(),
        consultation=consultation,
    )


def _parse_groups(raw: str) -> str:
    tokens = [token.strip() for token in raw.split(",")]
    for token in tokens:
        if not GROUP_RE.match(token):
            raise ScheduleParseError(
                f"токен '{token}' не похож на код группы; "
                f"если формат кодов групп изменился, поправить GROUP_RE"
            )
    return ", ".join(tokens)


def _parse_week_day(name: str, exam_date: date) -> int:
    week_day = DAYS.get(name.lower())
    if week_day is None:
        raise ScheduleParseError(f"неизвестный день недели: '{name}'")
    if week_day != exam_date.isoweekday():
        raise ScheduleParseError(
            f"день недели '{name}' не совпадает с датой {exam_date.isoformat()}"
        )
    return week_day


def _parse_date(value: str) -> date:
    day, month, year = value.split(".")
    try:
        return date(int(year), int(month), int(day))
    except ValueError:
        raise ScheduleParseError(f"дата вне календаря: '{value}'") from None


def _parse_time(value: str) -> str:
    hour, minute = value.split(":")
    try:
        return time(int(hour), int(minute)).strftime("%H:%M")
    except ValueError:
        raise ScheduleParseError(f"время вне суток: '{value}'") from None


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\x00", "")).strip()

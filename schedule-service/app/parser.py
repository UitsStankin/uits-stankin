import io
import re
from typing import BinaryIO

import pdfplumber
from pydantic import ValidationError

from app.errors import ScheduleParseError
from app.models import DatePeriod, Lesson, ParsedSchedule

TIMINGS = {
    "8:30 - 10:10": 1,
    "10:20 - 12:00": 2,
    "12:20 - 14:00": 3,
    "14:10 - 15:50": 4,
    "16:00 - 17:40": 5,
    "18:00 - 19:30": 6,
    "19:40 - 21:10": 7,
    "21:20 - 22:50": 8,
}

DAYS = {
    "понедельник": 1,
    "вторник": 2,
    "среда": 3,
    "четверг": 4,
    "пятница": 5,
    "суббота": 6,
}

LESSON_TYPES = {"Лекция", "Семинар", "Лабораторная"}

ENTRY_RE = re.compile(r"([^\[\]]+?)\[([^\[\]]+)\]")
GROUP_RE = re.compile(r"^[А-ЯЁ]+-\d{2}-\d{2}\S*$")
SUBGROUP_RE = re.compile(r"^\(([А-ЯЁA-Z])\)$")
SUBGROUP_LIKE_RE = re.compile(r"^\(\S{1,2}\)$")
SINGLE_DATE_RE = re.compile(r"^\d{2}\.\d{2}$")
PERIOD_RE = re.compile(r"^(\d{2}\.\d{2})\s*-\s*(\d{2}\.\d{2})\s+(к\.н|ч\.н)\.?$")


def parse_schedule(source: bytes | BinaryIO) -> ParsedSchedule:
    if isinstance(source, bytes):
        source = io.BytesIO(source)
    try:
        pdf = pdfplumber.open(source)
    except Exception as e:
        raise ScheduleParseError("файл не удалось прочитать как PDF") from e
    try:
        with pdf:
            tables = [table for page in pdf.pages if (table := page.extract_table())]
    except Exception as e:
        raise ScheduleParseError("не удалось извлечь таблицы из PDF") from e
    if not tables:
        raise ScheduleParseError("в PDF не найдено ни одной таблицы расписания")
    lessons: list[Lesson] = []
    try:
        for table in tables:
            lessons.extend(_parse_table(table))
        return ParsedSchedule(lessons=lessons)
    except ValidationError as e:
        raise ScheduleParseError(f"результат разбора не прошёл валидацию схемы: {e}") from e


def _parse_table(table: list[list[str | None]]) -> list[Lesson]:
    slot_times = _parse_header(table[0])
    lessons: list[Lesson] = []
    day: int | None = None
    for row in table[1:]:
        day_cell = row[0]
        is_day_row = bool(day_cell)
        if is_day_row:
            day = _parse_day(day_cell)
        carry: str | None = None
        for class_time, cell in zip(slot_times, row[1:]):
            if is_day_row and cell is None:
                text = carry
            else:
                text = cell
                carry = cell if cell else None
            if not text:
                continue
            if day is None:
                raise ScheduleParseError(
                    "строка с занятиями встретилась раньше первой строки дня недели"
                )
            for entry in _parse_cell(text):
                lessons.append(Lesson(week_day=day, class_time=class_time, **entry))
    return lessons


def _parse_header(header: list[str | None]) -> list[int]:
    slot_times = []
    for cell in header[1:]:
        label = _normalize(cell or "")
        if label not in TIMINGS:
            raise ScheduleParseError(f"неизвестное время пары в заголовке таблицы: '{cell}'")
        slot_times.append(TIMINGS[label])
    return slot_times


def _parse_day(cell: str) -> int:
    name = re.sub(r"\s", "", cell)[::-1].lower()
    if name not in DAYS:
        raise ScheduleParseError(f"неизвестный день недели: '{cell}'")
    return DAYS[name]


def _parse_cell(text: str) -> list[dict]:
    normalized = _normalize(text)
    entries = []
    consumed = 0
    for match in ENTRY_RE.finditer(normalized):
        entries.append(_parse_entry(match.group(1), match.group(2)))
        consumed = match.end()
    if not entries:
        raise ScheduleParseError(f"в ячейке нет дат в квадратных скобках: '{normalized}'")
    leftover = normalized[consumed:].strip(" .")
    if leftover:
        raise ScheduleParseError(f"не удалось разобрать фрагмент ячейки: '{leftover}'")
    return entries


def _parse_entry(head: str, dates_raw: str) -> dict:
    parts = [part.strip() for part in head.strip().split(". ")]
    if len(parts) < 3:
        raise ScheduleParseError(f"не удалось разобрать занятие: '{head.strip()}'")
    group, name, lesson_type = parts[0], parts[1], parts[2].strip(" .")
    if not group or not name:
        raise ScheduleParseError(f"пустая группа или название занятия: '{head.strip()}'")
    for group_token in (token.strip() for token in group.split(",")):
        if not GROUP_RE.match(group_token):
            raise ScheduleParseError(
                f"токен '{group_token}' не похож на код группы в '{head.strip()}'; "
                f"если формат кодов групп изменился, поправить GROUP_RE"
            )
    if lesson_type not in LESSON_TYPES:
        raise ScheduleParseError(
            f"неизвестный тип занятия '{lesson_type}' в '{head.strip()}'; "
            f"если формат добавил новый тип, дополнить LESSON_TYPES"
        )
    subgroup: str | None = None
    cabinet: str | None = None
    for token in parts[3:]:
        token = token.strip(" .")
        if not token:
            continue
        subgroup_match = SUBGROUP_RE.match(token)
        if subgroup_match:
            if subgroup is not None:
                raise ScheduleParseError(f"две подгруппы в одном занятии: '{head.strip()}'")
            subgroup = subgroup_match.group(1)
        elif SUBGROUP_LIKE_RE.match(token):
            raise ScheduleParseError(
                f"токен '{token}' похож на подгруппу, но не распознан: '{head.strip()}'"
            )
        else:
            if cabinet is not None:
                raise ScheduleParseError(f"два кабинета в одном занятии: '{head.strip()}'")
            cabinet = token
    return {
        "group": group,
        "name": name,
        "type": lesson_type,
        "subgroup": subgroup,
        "cabinet": cabinet,
        "dates": _parse_dates(dates_raw),
    }


def _parse_dates(raw: str) -> list[DatePeriod]:
    dates = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if SINGLE_DATE_RE.match(chunk):
            date = _check_date(chunk)
            dates.append(DatePeriod(start=date, end=date, every_other_week=False))
            continue
        period = PERIOD_RE.match(chunk)
        if not period:
            raise ScheduleParseError(f"не удалось разобрать дату занятия: '{chunk}'")
        dates.append(
            DatePeriod(
                start=_check_date(period.group(1)),
                end=_check_date(period.group(2)),
                every_other_week=period.group(3) == "ч.н",
            )
        )
    if not dates:
        raise ScheduleParseError(f"пустой список дат занятия: '[{raw}]'")
    return dates


def _check_date(value: str) -> str:
    day, month = int(value[:2]), int(value[3:])
    if not (1 <= day <= 31 and 1 <= month <= 12):
        raise ScheduleParseError(f"дата занятия вне календаря: '{value}'")
    return value


def _normalize(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"(?<=\S)-\s*\n\s*", "-", text)
    text = text.replace("\n", " ")
    return re.sub(r"\s{2,}", " ", text).strip()

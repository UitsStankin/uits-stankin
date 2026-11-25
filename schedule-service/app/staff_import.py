import csv
import io
import re
import zipfile
from pathlib import Path
from typing import Any, BinaryIO

import openpyxl
from pydantic import ValidationError

from app.errors import ScheduleParseError
from app.models import ParsedStaffFile, ParsedStaffRow

MAX_SHEETS = 60
MAX_ROWS = 5000
MAX_UNPACKED_BYTES = 64 * 1024 * 1024
HEADER_SEARCH_ROWS = 20

NO_DATA_RE = re.compile(r"^(?:[-–—]+|нет)$", re.IGNORECASE)
INTEGER_RE = re.compile(r"^[+-]?\d+$")

EXACT_HEADER_ALIASES: dict[str, str] = {
    "фио": "full_name",
    "ф.и.о.": "full_name",
    "full_name": "full_name",
    "фамилия": "last_name",
    "last_name": "last_name",
    "имя": "first_name",
    "first_name": "first_name",
    "отчество": "patronymic",
    "patronymic": "patronymic",
    "должность": "position",
    "position": "position",
    "уч.степень": "degree",
    "уч. степень": "degree",
    "степень": "degree",
    "degree": "degree",
    "ученая степень": "degree",
    "учёная степень": "degree",
    "уч.звание": "rank",
    "уч. звание": "rank",
    "звание": "rank",
    "rank": "rank",
    "ученое звание": "rank",
    "учёное звание": "rank",
    "телефон": "phone_number",
    "phone": "phone_number",
    "phone_number": "phone_number",
    "мессенджер": "messenger",
    "messenger": "messenger",
    "стаж": "experience",
    "общий стаж": "experience",
    "experience": "experience",
    "стаж по специальности": "professional_experience",
    "professional_experience": "professional_experience",
    "образование": "education",
    "education": "education",
    "квалификация": "qualification",
    "повышение квалификации": "qualification",
    "qualification": "qualification",
    "о себе": "bio",
    "биография": "bio",
    "bio": "bio",
}

PREFIX_HEADER_ALIASES: tuple[tuple[str, str], ...] = (
    ("категория", "category"),
    ("category", "category"),
    ("e-mail", "email"),
    ("email", "email"),
    ("почта", "email"),
)

CSV_ENCODINGS: tuple[str, ...] = ("utf-8-sig", "utf-8", "cp1251")
CSV_DELIMITERS: tuple[str, ...] = (";", ",", "\t")

TEXT_FIELDS: tuple[str, ...] = (
    "category",
    "position",
    "degree",
    "rank",
    "email",
    "phone_number",
    "messenger",
)
RICH_TEXT_FIELDS: tuple[str, ...] = ("education", "qualification", "bio")


def parse_staff(source: bytes | BinaryIO, filename: str | None = None) -> ParsedStaffFile:
    data = source if isinstance(source, bytes) else source.read()
    if not data:
        raise ScheduleParseError("файл пустой")

    ext = _resolve_extension(data, filename)
    if ext == ".xlsx":
        return _parse_xlsx(data)
    if ext == ".csv":
        return _parse_csv(data)
    raise ScheduleParseError("поддерживаются только файлы формата .xlsx и .csv")


def _resolve_extension(data: bytes, filename: str | None) -> str:
    if filename is not None:
        ext = Path(filename.strip()).suffix.lower()
        if ext not in {".xlsx", ".csv"}:
            raise ScheduleParseError("поддерживаются только файлы формата .xlsx и .csv")
        return ext
    return ".xlsx" if data.startswith(b"PK\x03\x04") else ".csv"


def _parse_xlsx(data: bytes) -> ParsedStaffFile:
    stream = io.BytesIO(data)
    _check_archive(stream)
    try:
        workbook = openpyxl.load_workbook(stream, data_only=True)
    except Exception as e:
        raise ScheduleParseError("файл не удалось прочитать как книгу Excel") from e

    try:
        if len(workbook.worksheets) > MAX_SHEETS:
            raise ScheduleParseError(
                f"в книге {len(workbook.worksheets)} листов при пределе {MAX_SHEETS}"
            )
        non_empty_sheet = None
        for sheet in workbook.worksheets:
            if (sheet.max_row or 0) > MAX_ROWS:
                raise ScheduleParseError(
                    f"в листе '{sheet.title}' {sheet.max_row} строк при пределе {MAX_ROWS}"
                )
            if not _is_empty_sheet(sheet):
                non_empty_sheet = sheet
                break
        if non_empty_sheet is None:
            raise ScheduleParseError("в книге нет ни одного непустого листа")
        raw_rows = list(non_empty_sheet.iter_rows(values_only=True))
    finally:
        workbook.close()

    return _parse_table(raw_rows)


def _check_archive(source: BinaryIO) -> None:
    try:
        with zipfile.ZipFile(source) as archive:
            unpacked = sum(item.file_size for item in archive.infolist())
    except zipfile.BadZipFile as e:
        raise ScheduleParseError("файл не удалось прочитать как книгу Excel") from e
    if unpacked > MAX_UNPACKED_BYTES:
        limit_mb = MAX_UNPACKED_BYTES // (1024 * 1024)
        raise ScheduleParseError(
            f"распакованное содержимое книги больше допустимых {limit_mb} МБ"
        )
    source.seek(0)


def _is_empty_sheet(sheet: Any) -> bool:
    if (sheet.max_row or 0) > MAX_ROWS:
        raise ScheduleParseError(
            f"в листе '{sheet.title}' {sheet.max_row} строк при пределе {MAX_ROWS}"
        )
    for row in sheet.iter_rows(values_only=True):
        if any(value is not None and str(value).strip() != "" for value in row):
            return False
    return True


def _parse_csv(data: bytes) -> ParsedStaffFile:
    if b"\x00" in data:
        raise ScheduleParseError("файл не удалось прочитать как CSV")

    text = _decode_csv(data)
    if not text.strip():
        raise ScheduleParseError("CSV-файл пустой")

    rows = _read_csv_with_detected_delimiter(text)
    if len(rows) > MAX_ROWS:
        raise ScheduleParseError(f"в файле {len(rows)} строк при пределе {MAX_ROWS}")

    return _parse_table(rows)


def _decode_csv(data: bytes) -> str:
    for encoding in CSV_ENCODINGS:
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ScheduleParseError("не удалось определить кодировку CSV-файла (ожидается UTF-8 или CP1251)")


def _read_csv_with_detected_delimiter(text: str) -> list[list[str]]:
    best_rows: list[list[str]] | None = None
    best_score = -1

    for delimiter in CSV_DELIMITERS:
        parsed = list(csv.reader(io.StringIO(text, newline=""), delimiter=delimiter))
        header = _find_header(parsed)
        if header is not None:
            _, columns = header
            score = len(columns)
            if score > best_score:
                best_score = score
                best_rows = parsed

    if best_rows is not None:
        return best_rows

    raise ScheduleParseError(
        "в таблице не найдены обязательные колонки заголовка (ФИО или Фамилия+Имя, и Должность)"
    )


def _parse_table(raw_rows: list[tuple[Any, ...] | list[Any]]) -> ParsedStaffFile:
    if not raw_rows or all(not any(v is not None and str(v).strip() != "" for v in r) for r in raw_rows):
        raise ScheduleParseError("файл не содержит данных")

    header = _find_header(raw_rows)
    if header is None:
        raise ScheduleParseError(
            "в таблице не найдены обязательные колонки заголовка (ФИО или Фамилия+Имя, и Должность)"
        )

    header_index, columns = header
    parsed_rows: list[ParsedStaffRow] = []
    warnings: list[str] = []

    for row_index in range(header_index + 1, len(raw_rows)):
        row = raw_rows[row_index]
        parsed = _parse_row(row_index + 1, row, columns)
        if parsed is not None:
            parsed_rows.append(parsed)

    if not parsed_rows:
        raise ScheduleParseError("в файле нет ни одной строки данных")

    try:
        return ParsedStaffFile(rows=parsed_rows, warnings=warnings)
    except ValidationError as e:
        raise ScheduleParseError(f"результат разбора не прошёл валидацию схемы: {e}") from e


def _find_header(raw_rows: list[tuple[Any, ...] | list[Any]]) -> tuple[int, dict[str, int]] | None:
    limit = min(len(raw_rows), HEADER_SEARCH_ROWS)
    for row_index in range(limit):
        row = raw_rows[row_index]
        columns: dict[str, int] = {}
        for col_index, cell_value in enumerate(row):
            field = _map_header(cell_value)
            if field is not None:
                columns.setdefault(field, col_index)
        has_name = "full_name" in columns or ("last_name" in columns and "first_name" in columns)
        if has_name and "position" in columns:
            return row_index, columns
    return None


def _map_header(value: Any) -> str | None:
    text = _normalize_spaces(value)
    if not text:
        return None
    lowered = text.lower().rstrip(":").strip()
    if lowered in EXACT_HEADER_ALIASES:
        return EXACT_HEADER_ALIASES[lowered]
    for prefix, field in PREFIX_HEADER_ALIASES:
        if lowered.startswith(prefix):
            return field
    return None


def _parse_row(
    row_number: int,
    row: tuple[Any, ...] | list[Any],
    columns: dict[str, int],
) -> ParsedStaffRow | None:
    def raw_at(field: str) -> Any:
        idx = columns.get(field)
        if idx is None or idx >= len(row):
            return None
        return row[idx]

    full_name = _clean_single_line(raw_at("full_name"))
    last_name = _clean_single_line(raw_at("last_name"))
    first_name = _clean_single_line(raw_at("first_name"))
    patronymic = _clean_single_line(raw_at("patronymic"))

    if full_name and not (last_name or first_name):
        last_name, first_name, split_patronymic = _split_full_name(full_name)
        if patronymic is None:
            patronymic = split_patronymic

    values: dict[str, Any] = {
        "last_name": last_name,
        "first_name": first_name,
        "patronymic": patronymic,
    }
    for field in TEXT_FIELDS:
        values[field] = _clean_single_line(raw_at(field))
    for field in RICH_TEXT_FIELDS:
        values[field] = _clean_rich_text(raw_at(field))

    parse_errors: list[str] = []
    exp_raw = raw_at("experience")
    prof_exp_raw = raw_at("professional_experience")
    values["experience"] = _parse_int(exp_raw, "стаж", parse_errors)
    values["professional_experience"] = _parse_int(
        prof_exp_raw, "стаж по специальности", parse_errors
    )

    has_any_data = (
        any(v is not None for v in values.values())
        or bool(parse_errors)
        or full_name is not None
    )
    if not has_any_data:
        return None

    return ParsedStaffRow(
        row_number=row_number,
        parse_errors=parse_errors,
        **values,
    )


def _split_full_name(full_name: str) -> tuple[str | None, str | None, str | None]:
    parts = full_name.split()
    if len(parts) >= 3:
        return parts[0], parts[1], " ".join(parts[2:])
    if len(parts) == 2:
        return parts[0], parts[1], None
    if len(parts) == 1:
        return parts[0], None, None
    return None, None, None


def _normalize_spaces(value: Any) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    text = str(value).replace("\x00", "")
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned if cleaned else None


def _clean_single_line(value: Any) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, float):
        text = str(int(value)) if value.is_integer() else str(value)
    else:
        text = re.sub(r"\s+", " ", str(value).replace("\x00", "")).strip()
    if not text or NO_DATA_RE.match(text):
        return None
    return text


def _clean_rich_text(value: Any) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    text = str(value).replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text or NO_DATA_RE.match(text):
        return None
    return text


def _parse_int(value: Any, label: str, parse_errors: list[str]) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        parse_errors.append(f"Поле «{label}» («{value}») не является целым числом")
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        parse_errors.append(f"Поле «{label}» ({value}) должно быть целым числом")
        return None
    cleaned = _clean_single_line(value)
    if cleaned is None:
        return None
    if INTEGER_RE.match(cleaned):
        return int(cleaned)
    parse_errors.append(f"Поле «{label}» («{cleaned}») не является целым числом")
    return None

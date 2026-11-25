import io
import zipfile

import openpyxl
import pytest
from fastapi.testclient import TestClient

from app.errors import ScheduleParseError
from app.main import MAX_UPLOAD_BYTES, app
from app.staff_import import MAX_ROWS, MAX_UNPACKED_BYTES, parse_staff


def _dump_workbook(workbook: openpyxl.Workbook) -> bytes:
    stream = io.BytesIO()
    workbook.save(stream)
    return stream.getvalue()


def _build_xlsx(rows: list[list[object]], *, empty_first_sheet: bool = False) -> bytes:
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    if empty_first_sheet:
        sheet.title = "Пустой"
        sheet = workbook.create_sheet("Сотрудники")
    else:
        sheet.title = "Сотрудники"
    for r_idx, row in enumerate(rows, start=1):
        for c_idx, value in enumerate(row, start=1):
            sheet.cell(row=r_idx, column=c_idx, value=value)
    return _dump_workbook(workbook)


class TestParseStaffUnit:
    def test_xlsx_with_aliases_prefixes_dashes_and_raw_email(self):
        xlsx = _build_xlsx(
            [
                ["Список сотрудников кафедры"],
                [
                    "№",
                    "  Ф.И.О. ",
                    "Категория (ППС - преподаватели, УВП - персонал)",
                    "Должность",
                    "Уч. степень",
                    "Уч.звание",
                    "E-mail @stankin.ru",
                    "Телефон",
                    "Мессенджер",
                    "Общий стаж",
                    "Стаж по специальности",
                    "Образование",
                    "Повышение квалификации",
                    "О себе",
                ],
                [
                    1,
                    "Иванов Иван Иванович",
                    "ППС",
                    "доцент",
                    "канд. техн. наук",
                    "-",
                    "I.Ivanov@stankin.ru",
                    "+7 (499) 972-95-84",
                    "—",
                    15,
                    10,
                    "МГТУ СТАНКИН",
                    "нет",
                    "Научный руководитель",
                ],
                [
                    2,
                    "Петрова Мария Сергеевна",
                    "УВП, ППС",
                    "ст. преподаватель",
                    "—",
                    "доцент",
                    "m.petrovа@stankin.ru",  # Cyrillic 'а' preserved for Java validation
                    None,
                    "@mpetrova",
                    "abc",
                    -2,
                    None,
                    None,
                    "-",
                ],
                [None, None, None, None],
            ]
        )

        parsed = parse_staff(xlsx, "staff.xlsx")

        assert parsed.warnings == []
        assert len(parsed.rows) == 2

        first = parsed.rows[0]
        assert first.row_number == 3
        assert first.last_name == "Иванов"
        assert first.first_name == "Иван"
        assert first.patronymic == "Иванович"
        assert first.category == "ППС"
        assert first.position == "доцент"
        assert first.degree == "канд. техн. наук"
        assert first.rank is None
        assert first.email == "I.Ivanov@stankin.ru"
        assert first.phone_number == "+7 (499) 972-95-84"
        assert first.messenger is None
        assert first.experience == 15
        assert first.professional_experience == 10
        assert first.education == "МГТУ СТАНКИН"
        assert first.qualification is None
        assert first.bio == "Научный руководитель"
        assert first.parse_errors == []

        second = parsed.rows[1]
        assert second.row_number == 4
        assert second.category == "УВП, ППС"
        assert second.degree is None
        assert second.rank == "доцент"
        assert second.email == "m.petrovа@stankin.ru"
        assert second.experience is None
        assert second.professional_experience == -2
        assert len(second.parse_errors) == 1
        assert "abc" in second.parse_errors[0]

    def test_xlsx_picks_first_non_empty_sheet(self):
        xlsx = _build_xlsx(
            [
                ["ФИО", "Должность"],
                ["Сидоров Олег Петрович", "профессор"],
            ],
            empty_first_sheet=True,
        )

        parsed = parse_staff(xlsx, "staff.xlsx")
        assert len(parsed.rows) == 1
        assert parsed.rows[0].last_name == "Сидоров"

    def test_split_name_columns_and_english_aliases(self):
        xlsx = _build_xlsx(
            [
                ["last_name", "first_name", "patronymic", "position", "email", "experience"],
                ["Соколов", "Алексей", None, "ассистент", "a.sokolov@stankin.ru", 3.0],
            ]
        )

        parsed = parse_staff(xlsx, "split.xlsx")
        assert len(parsed.rows) == 1
        row = parsed.rows[0]
        assert row.last_name == "Соколов"
        assert row.first_name == "Алексей"
        assert row.patronymic is None
        assert row.position == "ассистент"
        assert row.experience == 3

    @pytest.mark.parametrize(
        ("encoding", "delimiter"),
        [
            ("utf-8-sig", ";"),
            ("utf-8", ","),
            ("cp1251", "\t"),
        ],
    )
    def test_csv_encodings_and_delimiters(self, encoding: str, delimiter: str):
        lines = [
            delimiter.join(["Фамилия", "Имя", "Отчество", "Категория", "Должность", "Почта"]),
            delimiter.join(["Смирнов", "Дмитрий", "Олегович", "ППС", "доцент", "d.smirnov@stankin.ru"]),
            delimiter.join(["Кузнецова", "Анна", "-", "УВП", "инженер", "—"]),
        ]
        raw = "\n".join(lines).encode(encoding)

        parsed = parse_staff(raw, "staff.csv")
        assert len(parsed.rows) == 2
        assert parsed.rows[0].row_number == 2
        assert parsed.rows[0].last_name == "Смирнов"
        assert parsed.rows[0].email == "d.smirnov@stankin.ru"
        assert parsed.rows[1].patronymic is None
        assert parsed.rows[1].email is None

    def test_unsupported_extension_raises_parse_error(self):
        with pytest.raises(ScheduleParseError, match="формата .xlsx и .csv"):
            parse_staff(b"content", "staff.txt")

    def test_empty_file_raises_parse_error(self):
        with pytest.raises(ScheduleParseError, match="пустой"):
            parse_staff(b"", "staff.csv")

    def test_corrupt_xlsx_raises_parse_error(self):
        with pytest.raises(ScheduleParseError, match="Excel"):
            parse_staff(b"not a zip", "staff.xlsx")

    def test_missing_required_headers_raises_parse_error(self):
        xlsx = _build_xlsx(
            [
                ["ФИО", "Email"],
                ["Иванов Иван", "i@stankin.ru"],
            ]
        )
        with pytest.raises(ScheduleParseError, match="обязательные колонки"):
            parse_staff(xlsx, "missing_position.xlsx")

    def test_zero_data_rows_raises_parse_error(self):
        xlsx = _build_xlsx([["ФИО", "Должность"]])
        with pytest.raises(ScheduleParseError, match="нет ни одной строки данных"):
            parse_staff(xlsx, "header_only.xlsx")

    def test_csv_nul_byte_raises_parse_error(self):
        with pytest.raises(ScheduleParseError, match="CSV"):
            parse_staff(b"a,b\x00c", "bad.csv")

    def test_zip_bomb_rejected(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("big.txt", b"0" * (MAX_UNPACKED_BYTES + 1024))
        with pytest.raises(ScheduleParseError, match="распакованное содержимое"):
            parse_staff(stream.getvalue(), "bomb.xlsx")

    def test_too_many_rows_rejected(self):
        rows = [["ФИО", "Должность"]] + [["Иванов Иван", "доцент"] for _ in range(MAX_ROWS)]
        csv_bytes = "\n".join(";".join(r) for r in rows).encode("utf-8")
        with pytest.raises(ScheduleParseError, match=str(MAX_ROWS)):
            parse_staff(csv_bytes, "too_many.csv")

    def test_xlsx_too_many_rows_rejected_before_scanning_empty_sheet(self):
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.cell(row=MAX_ROWS + 1, column=1, value=" ")
        with pytest.raises(ScheduleParseError, match=str(MAX_ROWS)):
            parse_staff(_dump_workbook(workbook), "huge_empty.xlsx")

    def test_table_strips_nul_bytes_and_xlsx_records_bool_int_error(self):
        from app.staff_import import _parse_table

        parsed_table = _parse_table(
            [
                ["ФИО", "Должность", "Образование", "Квалификация"],
                ["Иванов\x00 Иван", "до\x00цент", "МГТУ\x00\nСТАНКИН", "Курс\x00 1"],
            ]
        )
        assert len(parsed_table.rows) == 1
        assert parsed_table.rows[0].last_name == "Иванов"
        assert parsed_table.rows[0].position == "доцент"
        assert parsed_table.rows[0].education == "МГТУ\nСТАНКИН"
        assert parsed_table.rows[0].qualification == "Курс 1"

        xlsx = _build_xlsx(
            [
                ["ФИО", "Должность", "Стаж", "Стаж по специальности"],
                ["Иванов Иван", "доцент", True, False],
            ]
        )

        parsed = parse_staff(xlsx, "bool_int.xlsx")
        assert len(parsed.rows) == 1
        row = parsed.rows[0]
        assert row.experience is None
        assert row.professional_experience is None
        assert len(row.parse_errors) == 2
        assert "True" in row.parse_errors[0]
        assert "False" in row.parse_errors[1]


class TestParseStaffEndpoint:
    def test_endpoint_valid_csv_returns_200(self):
        client = TestClient(app)
        content = "ФИО;Должность;E-mail\nТестов Тест Тестович;доцент;t.testov@stankin.ru\n".encode("utf-8-sig")
        response = client.post(
            "/parse-staff",
            files={"file": ("staff.csv", content, "text/csv")},
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body["rows"]) == 1
        assert body["rows"][0]["last_name"] == "Тестов"

    def test_endpoint_missing_headers_returns_422(self):
        client = TestClient(app)
        content = "ФИО;Телефон\nТестов Тест;+79990000000\n".encode("utf-8")
        response = client.post(
            "/parse-staff",
            files={"file": ("staff.csv", content, "text/csv")},
        )
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"

    def test_endpoint_unsupported_extension_returns_422(self):
        client = TestClient(app)
        response = client.post(
            "/parse-staff",
            files={"file": ("staff.pdf", b"%PDF-1.4", "application/pdf")},
        )
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"

    def test_endpoint_without_file_returns_400(self):
        client = TestClient(app)
        response = client.post("/parse-staff")
        assert response.status_code == 400
        assert response.json()["error"] == "invalid_request"

    def test_endpoint_over_limit_returns_413(self):
        client = TestClient(app)
        response = client.post(
            "/parse-staff",
            files={"file": ("staff.csv", b"x" * (MAX_UPLOAD_BYTES + 1), "text/csv")},
        )
        assert response.status_code == 413
        assert response.json()["error"] == "file_too_large"

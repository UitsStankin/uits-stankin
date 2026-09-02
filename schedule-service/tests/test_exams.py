import io
import time
from datetime import date

import pdfplumber
import pytest

from app.errors import ScheduleParseError
from app.exams import EXAM_HEAD_RE, _parse_lines, parse_exams
from app.models import Consultation


@pytest.fixture(scope="module")
def bychkova(bychkova_exams_pdf):
    return parse_exams(bychkova_exams_pdf)


@pytest.fixture(scope="module")
def eliseeva(eliseeva_exams_pdf):
    return parse_exams(eliseeva_exams_pdf)


@pytest.fixture(scope="module")
def ibatulin(ibatulin_exams_pdf):
    return parse_exams(ibatulin_exams_pdf)


class TestBychkova:
    def test_first_exam(self, bychkova):
        exam = bychkova.exams[0]
        assert exam.date == "2025-01-09"
        assert exam.week_day == 4
        assert exam.time_start == "08:30"
        assert exam.time_end == "14:00"
        assert exam.cabinet == "209"
        assert exam.group == "ИДБ-21-10"
        assert exam.name == "Управление проектами"

    def test_consultation_may_fall_into_previous_year(self, bychkova):
        assert bychkova.exams[0].consultation == Consultation(
            date="2024-12-28", time="14:10", cabinet="302"
        )

    def test_consultation_belongs_to_the_exam_below_it(self, bychkova):
        assert bychkova.exams[1].date == "2025-01-13"
        assert bychkova.exams[1].consultation.date == "2025-01-11"

    def test_last_exam(self, bychkova):
        exam = bychkova.exams[-1]
        assert exam.date == "2025-01-25"
        assert exam.week_day == 6
        assert exam.group == "ИДБ-22-11"
        assert exam.name == "Базы данных"

    def test_every_exam_has_a_consultation(self, bychkova):
        assert all(exam.consultation is not None for exam in bychkova.exams)


class TestEliseeva:
    def test_cabinet_with_letter_in_parens(self, eliseeva):
        exam = eliseeva.exams[1]
        assert exam.cabinet == "306(а)"
        assert exam.consultation.cabinet == "306(а)"

    def test_two_exams_share_one_weekday(self, eliseeva):
        assert [exam.week_day for exam in eliseeva.exams] == [1, 5, 5]

    def test_dates_are_iso(self, eliseeva):
        assert [exam.date for exam in eliseeva.exams] == [
            "2025-01-13",
            "2025-01-17",
            "2025-01-24",
        ]


class TestIbatulin:
    def test_long_discipline_is_not_truncated(self, ibatulin):
        assert ibatulin.exams[1].name == (
            "Применение методов машинного обучения в информационно обоснованных решениях"
        )

    def test_four_digit_cabinet(self, ibatulin):
        assert ibatulin.exams[0].cabinet == "0402"

    def test_evening_time_range(self, ibatulin):
        exam = ibatulin.exams[1]
        assert exam.time_start == "16:00"
        assert exam.time_end == "21:10"

    def test_consultation_may_be_two_days_before_exam(self, ibatulin):
        exam = ibatulin.exams[2]
        assert exam.date == "2025-05-19"
        assert exam.consultation.date == "2025-05-17"


class TestAcrossFixtures:
    def test_total_exam_counts(self, bychkova, eliseeva, ibatulin):
        assert len(bychkova.exams) == 7
        assert len(eliseeva.exams) == 3
        assert len(ibatulin.exams) == 5

    def test_times_are_zero_padded(self, bychkova, eliseeva, ibatulin):
        for parsed in (bychkova, eliseeva, ibatulin):
            for exam in parsed.exams:
                assert len(exam.time_start) == 5
                assert len(exam.time_end) == 5
                assert len(exam.consultation.time) == 5

    def test_weekday_matches_the_date(self, bychkova, eliseeva, ibatulin):
        for parsed in (bychkova, eliseeva, ibatulin):
            for exam in parsed.exams:
                year, month, day = (int(part) for part in exam.date.split("-"))
                assert date(year, month, day).isoweekday() == exam.week_day


class TestMultiPage:
    def test_exams_come_from_all_pages(self, two_page_exams_pdf, bychkova, eliseeva):
        merged = parse_exams(two_page_exams_pdf)
        assert len(merged.exams) == len(bychkova.exams) + len(eliseeva.exams)
        assert merged.exams[0] == bychkova.exams[0]
        assert merged.exams[-1] == eliseeva.exams[-1]


class TestTextBeyondPageEdge:
    def test_fixture_really_runs_off_the_page(self, overflowing_exams_pdf):
        with pdfplumber.open(io.BytesIO(overflowing_exams_pdf)) as pdf:
            page = pdf.pages[0]
            assert max(char["x1"] for char in page.chars) > page.width

    def test_discipline_past_the_page_edge_is_not_truncated(
        self, overflowing_exams_pdf, ibatulin
    ):
        shifted = parse_exams(overflowing_exams_pdf)
        assert [exam.name for exam in shifted.exams] == [
            exam.name for exam in ibatulin.exams
        ]

    def test_shifted_page_parses_identically(self, overflowing_exams_pdf, ibatulin):
        assert parse_exams(overflowing_exams_pdf) == ibatulin


class TestBrokenInput:
    def test_not_a_pdf(self):
        with pytest.raises(ScheduleParseError, match="не удалось прочитать как PDF"):
            parse_exams(b"definitely not a pdf")

    def test_pdf_without_table(self, blank_page_pdf):
        with pytest.raises(ScheduleParseError, match="не найдено ни одной таблицы"):
            parse_exams(blank_page_pdf)

    def test_lesson_schedule_is_not_an_exam_schedule(self, chekanin_pdf):
        with pytest.raises(ScheduleParseError, match="строка не похожа"):
            parse_exams(chekanin_pdf)

    def test_stream_gives_same_result_as_bytes(self, bychkova_exams_pdf, bychkova):
        assert parse_exams(io.BytesIO(bychkova_exams_pdf)) == bychkova


class TestLineParsing:
    HEAD = "09.01.2025 8:30 - 14:00 ауд. 209 ИДБ-21-10"
    TAIL = "Четверг Базы данных"
    CONSULTATION = "консультация: 28.12.2024 14:10 ауд. 302"

    def test_exam_without_consultation_is_allowed(self):
        exams = _parse_lines([self.HEAD, self.TAIL])
        assert len(exams) == 1
        assert exams[0].consultation is None

    def test_two_consultations_in_a_row(self):
        lines = [self.CONSULTATION, self.CONSULTATION, self.HEAD, self.TAIL]
        with pytest.raises(ScheduleParseError, match="две консультации подряд"):
            _parse_lines(lines)

    def test_dangling_consultation_at_the_end(self):
        with pytest.raises(ScheduleParseError, match="осталась без экзамена"):
            _parse_lines([self.HEAD, self.TAIL, self.CONSULTATION])

    def test_exam_without_second_line(self):
        with pytest.raises(ScheduleParseError, match="нет второй строки"):
            _parse_lines([self.HEAD])

    def test_second_line_is_another_consultation(self):
        with pytest.raises(ScheduleParseError, match="вторая строка экзамена не похожа"):
            _parse_lines([self.HEAD, self.CONSULTATION])

    def test_unparsed_line(self):
        with pytest.raises(ScheduleParseError, match="строка не похожа"):
            _parse_lines(["загадочная строка"])

    def test_unknown_week_day(self):
        with pytest.raises(ScheduleParseError, match="неизвестный день недели"):
            _parse_lines([self.HEAD, "Воскресенье Базы данных"])

    def test_week_day_disagrees_with_date(self):
        with pytest.raises(ScheduleParseError, match="не совпадает с датой"):
            _parse_lines([self.HEAD, "Пятница Базы данных"])

    def test_group_token_is_not_a_group(self):
        head = "09.01.2025 8:30 - 14:00 ауд. 209 ГРУППА"
        with pytest.raises(ScheduleParseError, match="не похож на код группы"):
            _parse_lines([head, self.TAIL])

    def test_date_outside_calendar(self):
        head = "31.02.2025 8:30 - 14:00 ауд. 209 ИДБ-21-10"
        with pytest.raises(ScheduleParseError, match="дата вне календаря"):
            _parse_lines([head, self.TAIL])

    def test_time_outside_day(self):
        head = "09.01.2025 25:30 - 26:00 ауд. 209 ИДБ-21-10"
        with pytest.raises(ScheduleParseError, match="время вне суток"):
            _parse_lines([head, self.TAIL])

    def test_exam_ending_before_it_starts(self):
        head = "09.01.2025 14:00 - 8:30 ауд. 209 ИДБ-21-10"
        with pytest.raises(ScheduleParseError, match="заканчивается не позже"):
            _parse_lines([head, self.TAIL])

    def test_two_groups_with_space(self):
        head = "09.01.2025 8:30 - 14:00 ауд. 209 ИДБ-21-10, ИДБ-21-11"
        assert _parse_lines([head, self.TAIL])[0].group == "ИДБ-21-10, ИДБ-21-11"

    def test_two_groups_without_space(self):
        head = "09.01.2025 8:30 - 14:00 ауд. 209 ИДБ-21-10,ИДБ-21-11"
        assert _parse_lines([head, self.TAIL])[0].group == "ИДБ-21-10, ИДБ-21-11"

    def test_broken_token_inside_group_list(self):
        head = "09.01.2025 8:30 - 14:00 ауд. 209 ИДБ-21-10,ГРУППА"
        with pytest.raises(ScheduleParseError, match="не похож на код группы"):
            _parse_lines([head, self.TAIL])

    def test_extra_token_after_group_is_rejected(self):
        head = "09.01.2025 8:30 - 14:00 ауд. 209 ИДБ-21-10 хвост"
        with pytest.raises(ScheduleParseError, match="строка не похожа"):
            _parse_lines([head, self.TAIL])

    def test_empty_line_list(self):
        with pytest.raises(ScheduleParseError, match="ни одного экзамена"):
            _parse_lines([])

    def test_hostile_group_list_fails_fast(self):
        line = "09.01.2025 8:30 - 14:00 ауд. 209 " + "ИДБ-21-10," * 30 + " хвост хвост"
        started = time.perf_counter()
        assert EXAM_HEAD_RE.match(line) is None
        assert time.perf_counter() - started < 0.5

import io

import pytest

from app.errors import ScheduleParseError
from app.models import DatePeriod, Lesson
from app.parser import (
    GROUP_RE,
    _parse_cell,
    _parse_dates,
    _parse_day,
    _parse_entry,
    _parse_header,
    _parse_table,
    parse_schedule,
)


@pytest.fixture(scope="module")
def chekanin(chekanin_pdf):
    return parse_schedule(chekanin_pdf)


@pytest.fixture(scope="module")
def razumovskiy(razumovskiy_pdf):
    return parse_schedule(razumovskiy_pdf)


@pytest.fixture(scope="module")
def ibatulin(ibatulin_pdf):
    return parse_schedule(ibatulin_pdf)


def lessons_at(schedule, week_day, class_time):
    return [
        lesson
        for lesson in schedule.lessons
        if lesson.week_day == week_day and lesson.class_time == class_time
    ]


class TestChekanin:
    def test_monday_first_slot(self, chekanin):
        found = lessons_at(chekanin, 1, 1)
        assert len(found) == 2
        first = found[0]
        assert first.time_start == "08:30"
        assert first.time_end == "10:10"
        assert first.group == "ИДБ-25-11"
        assert first.name == "Технические средства информационных систем"
        assert first.type == "Лабораторная"
        assert first.subgroup == "Б"
        assert first.cabinet == "216"
        assert first.dates == [DatePeriod(start="16.03", end="27.04", every_other_week=True)]
        second = found[1]
        assert second.subgroup == "А"
        assert second.dates == [DatePeriod(start="23.03", end="04.05", every_other_week=True)]

    def test_merged_cell_spans_next_slot(self, chekanin):
        slot_one = lessons_at(chekanin, 1, 1)
        slot_two = lessons_at(chekanin, 1, 2)
        assert [
            lesson.model_dump(exclude={"class_time", "time_start", "time_end"})
            for lesson in slot_two
        ] == [
            lesson.model_dump(exclude={"class_time", "time_start", "time_end"})
            for lesson in slot_one
        ]
        assert {(lesson.time_start, lesson.time_end) for lesson in slot_one} == {("08:30", "10:10")}
        assert {(lesson.time_start, lesson.time_end) for lesson in slot_two} == {("10:20", "12:00")}

    def test_cabinet_with_uppercase_letters_in_parens(self, chekanin):
        found = lessons_at(chekanin, 2, 5)
        assert len(found) == 2
        assert {lesson.subgroup for lesson in found} == {"А", "Б"}
        assert {lesson.cabinet for lesson in found} == {"0804(КК)"}

    def test_subrow_adds_lesson_to_occupied_slot(self, chekanin):
        found = lessons_at(chekanin, 2, 6)
        seminars = [lesson for lesson in found if lesson.type == "Семинар"]
        assert len(found) == 3
        assert len(seminars) == 1
        seminar = seminars[0]
        assert seminar.group == "ИДБ-24-15"
        assert seminar.cabinet is None
        assert seminar.dates == [DatePeriod(start="17.02", end="24.03", every_other_week=False)]

    def test_mixed_date_list(self, chekanin):
        found = lessons_at(chekanin, 6, 1)
        assert len(found) == 1
        assert found[0].dates == [
            DatePeriod(start="28.02", end="28.02", every_other_week=False),
            DatePeriod(start="14.03", end="04.04", every_other_week=False),
            DatePeriod(start="18.04", end="18.04", every_other_week=False),
        ]

    def test_lecture_for_five_groups(self, chekanin):
        found = lessons_at(chekanin, 4, 3)
        assert len(found) == 1
        lecture = found[0]
        assert lecture.group == "ИДБ-24-11, ИДБ-24-12, ИДБ-24-13, ИДБ-24-14, ИДБ-24-15"
        assert lecture.type == "Лекция"
        assert lecture.cabinet == "0411"
        assert lecture.dates == [
            DatePeriod(start="12.02", end="12.02", every_other_week=False),
            DatePeriod(start="26.02", end="21.05", every_other_week=False),
        ]

    def test_monday_total(self, chekanin):
        monday = [lesson for lesson in chekanin.lessons if lesson.week_day == 1]
        assert len(monday) == 12


class TestRazumovskiy:
    def test_empty_day_has_no_lessons(self, razumovskiy):
        assert [lesson for lesson in razumovskiy.lessons if lesson.week_day == 1] == []

    def test_hyphen_line_break_in_name(self, razumovskiy):
        found = lessons_at(razumovskiy, 3, 2)
        assert len(found) == 1
        lecture = found[0]
        assert lecture.name == "Объектно-ориентированное программирование"
        assert lecture.group == "ИДБ-25-11, ИДБ-25-12, ИДБ-25-13, ИДБ-25-14, ИДБ-25-15"

    def test_two_lessons_in_one_subrow_cell(self, razumovskiy):
        found = lessons_at(razumovskiy, 2, 5)
        assert len(found) == 4
        assert {(lesson.type, lesson.group) for lesson in found} == {
            ("Лабораторная", "ИДБ-23-14"),
            ("Лекция", "ЭЛ-25-01-ПГТ"),
            ("Семинар", "ЭЛ-25-01-ПГТ"),
        }

    def test_merged_cell_carries_into_last_slot(self, razumovskiy):
        found = lessons_at(razumovskiy, 2, 8)
        assert len(found) == 2
        assert {lesson.group for lesson in found} == {"ЭЛ-25-01-ПГТ"}
        assert {lesson.subgroup for lesson in found} == {"А", "Б"}

    def test_group_with_parens_and_empty_cabinet(self, razumovskiy):
        found = lessons_at(razumovskiy, 3, 7)
        assert len(found) == 1
        lab = found[0]
        assert lab.group == "ИДМ-25-03(ИГ)"
        assert lab.subgroup is None
        assert lab.cabinet is None


class TestIbatulin:
    def test_three_lessons_in_one_cell(self, ibatulin):
        found = lessons_at(ibatulin, 1, 5)
        assert len(found) == 3
        assert {lesson.name for lesson in found} == {
            "Применение методов машинного обучения в информационно обоснованных решениях",
            "Методы анализа и прогнозирования данных",
        }

    def test_cabinet_none_for_lecture_without_room(self, ibatulin):
        found = lessons_at(ibatulin, 2, 1)
        assert len(found) == 1
        assert found[0].type == "Лекция"
        assert found[0].cabinet is None

    def test_total_lesson_counts(self, chekanin, razumovskiy, ibatulin):
        assert len(chekanin.lessons) == 49
        assert len(razumovskiy.lessons) == 36
        assert len(ibatulin.lessons) == 78


class TestMultiPage:
    def test_lessons_come_from_all_pages(self, two_page_pdf):
        merged = parse_schedule(two_page_pdf)
        names = {lesson.name for lesson in merged.lessons}
        assert "Вычислительная механика" in names
        assert "Компьютерная графика и геометрическое моделирование" in names

    def test_merged_size_is_sum_of_pages(self, two_page_pdf, chekanin, razumovskiy):
        merged = parse_schedule(two_page_pdf)
        assert len(merged.lessons) == len(chekanin.lessons) + len(razumovskiy.lessons)


class TestBrokenInput:
    def test_not_a_pdf(self):
        with pytest.raises(ScheduleParseError, match="не удалось прочитать как PDF"):
            parse_schedule(b"definitely not a pdf")

    def test_pdf_without_table(self, blank_page_pdf):
        with pytest.raises(ScheduleParseError, match="не найдено ни одной таблицы"):
            parse_schedule(blank_page_pdf)

    def test_stream_gives_same_result_as_bytes(self, chekanin_pdf, chekanin):
        assert parse_schedule(io.BytesIO(chekanin_pdf)) == chekanin


class TestTableParsing:
    def test_lesson_before_first_day_row(self):
        table = [
            ["", "8:30 - 10:10"],
            [None, "ИДБ-25-11. Физика. Лекция. 0411. [12.02]"],
        ]
        with pytest.raises(ScheduleParseError, match="раньше первой строки дня"):
            _parse_table(table)

    def test_parses_2026_bell_schedule_with_dashes_and_zero_padding(self):
        header = [
            "",
            "8:30 - 10:05",
            "10:15–11:50",
            "12:20 — 13:55",
            "14:05-15:40",
            "15:50 - 17:25",
            "18:00 - 19:30",
            "19:40 - 21:10",
            "21:20 - 22:50",
        ]
        assert _parse_header(header) == [
            (1, "08:30", "10:05"),
            (2, "10:15", "11:50"),
            (3, "12:20", "13:55"),
            (4, "14:05", "15:40"),
            (5, "15:50", "17:25"),
            (6, "18:00", "19:30"),
            (7, "19:40", "21:10"),
            (8, "21:20", "22:50"),
        ]

    def test_parses_legacy_bell_schedule(self):
        header = [
            "",
            "8:30 - 10:10",
            "10:20 - 12:00",
            "12:20 - 14:00",
            "14:10 - 15:50",
            "16:00 - 17:40",
            "18:00 - 19:30",
            "19:40 - 21:10",
            "21:20 - 22:50",
        ]
        assert _parse_header(header) == [
            (1, "08:30", "10:10"),
            (2, "10:20", "12:00"),
            (3, "12:20", "14:00"),
            (4, "14:10", "15:50"),
            (5, "16:00", "17:40"),
            (6, "18:00", "19:30"),
            (7, "19:40", "21:10"),
            (8, "21:20", "22:50"),
        ]

    def test_parses_arbitrary_ten_slots_and_populates_table_lessons(self):
        header = [
            "",
            "7:00 - 8:20",
            "8:30 - 10:00",
            "10:10 - 11:40",
            "11:50 - 13:20",
            "13:30 - 15:00",
            "15:10 - 16:40",
            "16:50 - 18:20",
            "18:30 - 20:00",
            "20:10 - 21:40",
            "21:50 - 23:20",
        ]
        table = [
            header,
            [
                "к\nи\nн\nь\nл\nе\nд\nе\nн\nо\nп",
                "ЭЛ-КС-25-01. Киберфизические системы. Семинар. [09.10]",
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                "ЭЛ-КС-25-01. Киберфизические системы. Лекция. 0411. [16.10]",
            ],
        ]
        lessons = _parse_table(table)
        assert len(lessons) == 10
        assert lessons[0].class_time == 1
        assert lessons[0].time_start == "07:00"
        assert lessons[0].time_end == "08:20"
        assert lessons[0].group == "ЭЛ-КС-25-01"
        assert lessons[8].class_time == 9
        assert lessons[8].time_start == "20:10"
        assert lessons[8].time_end == "21:40"
        assert lessons[9].class_time == 10
        assert lessons[9].time_start == "21:50"
        assert lessons[9].time_end == "23:20"
        assert lessons[9].cabinet == "0411"

    def test_empty_header_rejected(self):
        with pytest.raises(ScheduleParseError, match="нет ни одного интервала"):
            _parse_header([""])

    def test_more_than_ten_slots_rejected(self):
        header = [""] + [f"{8 + i}:00 - {8 + i}:45" for i in range(11)]
        with pytest.raises(ScheduleParseError, match="при пределе 10"):
            _parse_header(header)

    def test_invalid_header_interval_format_rejected(self):
        with pytest.raises(ScheduleParseError, match="некорректный интервал"):
            _parse_header(["", "первая пара"])

    def test_out_of_range_header_time_rejected(self):
        with pytest.raises(ScheduleParseError, match="время вне суток"):
            _parse_header(["", "25:00 - 26:00"])

    def test_reversed_or_zero_length_interval_rejected(self):
        with pytest.raises(ScheduleParseError, match="не меньше времени окончания"):
            _parse_header(["", "10:05 - 08:30"])
        with pytest.raises(ScheduleParseError, match="не меньше времени окончания"):
            _parse_header(["", "10:05 - 10:05"])

    def test_non_increasing_header_starts_rejected(self):
        with pytest.raises(ScheduleParseError, match="строго возрастать"):
            _parse_header(["", "10:15 - 11:50", "10:15 - 12:00"])
        with pytest.raises(ScheduleParseError, match="строго возрастать"):
            _parse_header(["", "10:15 - 11:50", "08:30 - 10:05"])

    def test_unknown_day(self):
        with pytest.raises(ScheduleParseError, match="неизвестный день недели"):
            _parse_day("картошка")


class TestCellParsing:
    def test_cell_without_bracket_dates(self):
        with pytest.raises(ScheduleParseError, match="нет дат в квадратных скобках"):
            _parse_cell("ИДБ-25-11. Физика. Лекция. 0411.")

    def test_unparsed_leftover_in_cell(self):
        with pytest.raises(ScheduleParseError, match="не удалось разобрать фрагмент"):
            _parse_cell("ИДБ-25-11. Физика. Лекция. 0411. [12.02] загадочный хвост")

    def test_unknown_lesson_type(self):
        with pytest.raises(ScheduleParseError, match="неизвестный тип занятия"):
            _parse_entry("ИДБ-25-11. Мат. анализ. Лекция. 0411. ", "12.02")

    def test_entry_with_too_few_parts(self):
        with pytest.raises(ScheduleParseError, match="не удалось разобрать занятие"):
            _parse_entry("Лекция ", "12.02")

    def test_unknown_date_format(self):
        with pytest.raises(ScheduleParseError, match="не удалось разобрать дату"):
            _parse_dates("вторая неделя марта")

    def test_range_without_week_marker(self):
        with pytest.raises(ScheduleParseError, match="не удалось разобрать дату"):
            _parse_dates("01.09-05.09")

    def test_empty_group(self):
        with pytest.raises(ScheduleParseError, match="пустая группа или название"):
            _parse_cell(". Вычислительная механика. Лекция. 0411. [12.02]")

    def test_empty_name(self):
        with pytest.raises(ScheduleParseError, match="пустая группа или название"):
            _parse_cell("ИДБ-25-11. . Лекция. 0411. [12.02]")

    def test_garbage_between_entries(self):
        cell = (
            "ИДБ-25-11. Физика. Лекция. 0411. [12.02] перенесено "
            "ИДБ-25-12. Физика. Лекция. 0411. [13.02]"
        )
        with pytest.raises(ScheduleParseError, match="не похож на код группы"):
            _parse_cell(cell)

    def test_two_subgroups(self):
        with pytest.raises(ScheduleParseError, match="две подгруппы"):
            _parse_entry("ИДБ-25-11. Физика. Лабораторная. (А). (Б). ", "12.02")

    def test_two_cabinets(self):
        with pytest.raises(ScheduleParseError, match="два кабинета"):
            _parse_entry("ИДБ-25-11. Физика. Лекция. 0411. 0412. ", "12.02")

    def test_subgroup_like_token_rejected(self):
        with pytest.raises(ScheduleParseError, match="похож на подгруппу"):
            _parse_entry("ИДБ-25-11. Физика. Лабораторная. (а). 216. ", "12.02")

    def test_date_outside_calendar(self):
        with pytest.raises(ScheduleParseError, match="вне календаря"):
            _parse_dates("45.13")

    def test_day_missing_in_month_rejected(self):
        with pytest.raises(ScheduleParseError, match="вне календаря"):
            _parse_dates("30.02")

    def test_day_31_in_30_day_month_rejected(self):
        with pytest.raises(ScheduleParseError, match="вне календаря"):
            _parse_dates("31.04")

    def test_february_29_accepted(self):
        assert _parse_dates("29.02")[0].start == "29.02"

    def test_single_digit_day_rejected(self):
        with pytest.raises(ScheduleParseError, match="не удалось разобрать дату"):
            _parse_dates("8.05")

    def test_empty_date_list(self):
        with pytest.raises(ScheduleParseError, match="пустой список дат"):
            _parse_dates(" , ")

    def test_period_tolerates_spaced_dash_and_missing_dot(self):
        assert _parse_dates("16.03 - 27.04 ч.н") == [
            DatePeriod(start="16.03", end="27.04", every_other_week=True)
        ]

    def test_trailing_period_after_dates(self):
        entries = _parse_cell("ИДБ-25-11. Физика. Лекция. 0411. [12.02].")
        assert len(entries) == 1

    def test_type_without_extras_loses_trailing_dot(self):
        entry = _parse_entry("ИДБ-25-11. Физика. Лекция. ", "12.02")
        assert entry["type"] == "Лекция"
        assert entry["cabinet"] is None

    def test_space_before_hyphen_break_keeps_space(self):
        entries = _parse_cell("ИДБ-25-11. Химия -\nчасть 2. Лекция. 0411. [12.02]")
        assert entries[0]["name"] == "Химия - часть 2"

    def test_composite_group_codes_accepted(self):
        assert GROUP_RE.match("ЭЛ-КС-25-01")
        assert GROUP_RE.match("А-Б-В-24-02(ИГ)")
        entries = _parse_cell("ЭЛ-КС-25-01, ИДБ-25-11. Физика. Лекция. 0411. [12.02]")
        assert entries[0]["group"] == "ЭЛ-КС-25-01, ИДБ-25-11"

    def test_lesson_model_accepts_slot_10_and_rejects_11(self):
        valid = Lesson(
            week_day=1,
            class_time=10,
            time_start="21:50",
            time_end="23:20",
            group="ЭЛ-КС-25-01",
            name="Физика",
            type="Лекция",
            dates=[DatePeriod(start="12.02", end="12.02", every_other_week=False)],
        )
        assert valid.class_time == 10
        with pytest.raises(ValueError):
            Lesson(
                week_day=1,
                class_time=11,
                time_start="21:50",
                time_end="23:20",
                group="ЭЛ-КС-25-01",
                name="Физика",
                type="Лекция",
                dates=[DatePeriod(start="12.02", end="12.02", every_other_week=False)],
            )

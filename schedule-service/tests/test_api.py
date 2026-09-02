import pytest
from fastapi.testclient import TestClient

from app import main
from app.errors import ScheduleParseError
from app.main import MAX_UPLOAD_BYTES, app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def post_pdf(client, content, field="file", filename="schedule.pdf", path="/parse"):
    return client.post(path, files={field: (filename, content, "application/pdf")})


def post_exams(client, content, **kwargs):
    return post_pdf(client, content, path="/parse-exams", **kwargs)


class TestHealth:
    def test_health(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestParse:
    def test_valid_pdf(self, client, chekanin_pdf):
        response = post_pdf(client, chekanin_pdf)
        assert response.status_code == 200
        assert len(response.json()["lessons"]) == 49

    def test_response_matches_contract(self, client, chekanin_pdf):
        lesson = post_pdf(client, chekanin_pdf).json()["lessons"][0]
        assert lesson == {
            "week_day": 1,
            "class_time": 1,
            "group": "ИДБ-25-11",
            "name": "Технические средства информационных систем",
            "type": "Лабораторная",
            "subgroup": "Б",
            "cabinet": "216",
            "dates": [{"start": "16.03", "end": "27.04", "every_other_week": True}],
        }

    def test_every_fixture_parses(self, client, razumovskiy_pdf, ibatulin_pdf):
        for content in (razumovskiy_pdf, ibatulin_pdf):
            assert post_pdf(client, content).status_code == 200

    def test_not_a_pdf(self, client):
        response = post_pdf(client, b"definitely not a pdf")
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"
        assert "PDF" in response.json()["detail"]

    def test_pdf_without_table(self, client, blank_page_pdf):
        response = post_pdf(client, blank_page_pdf)
        assert response.status_code == 422
        assert response.json() == {
            "error": "schedule_parse_error",
            "detail": "в PDF не найдено ни одной таблицы расписания",
        }

    def test_pdf_over_page_limit(self, client, over_page_limit_pdf):
        response = post_pdf(client, over_page_limit_pdf)
        assert response.status_code == 422
        assert response.json() == {
            "error": "schedule_parse_error",
            "detail": "в файле 51 страниц при пределе 50",
        }


class TestParseExams:
    def test_valid_pdf(self, client, bychkova_exams_pdf):
        response = post_exams(client, bychkova_exams_pdf)
        assert response.status_code == 200
        assert len(response.json()["exams"]) == 7

    def test_response_matches_contract(self, client, ibatulin_exams_pdf):
        exam = post_exams(client, ibatulin_exams_pdf).json()["exams"][1]
        assert exam == {
            "date": "2025-05-15",
            "week_day": 4,
            "time_start": "16:00",
            "time_end": "21:10",
            "cabinet": "308",
            "group": "ИДБ-21-11",
            "name": (
                "Применение методов машинного обучения "
                "в информационно обоснованных решениях"
            ),
            "consultation": {"date": "2025-05-14", "time": "16:00", "cabinet": "308"},
        }

    def test_every_fixture_parses(self, client, eliseeva_exams_pdf, ibatulin_exams_pdf):
        for content in (eliseeva_exams_pdf, ibatulin_exams_pdf):
            assert post_exams(client, content).status_code == 200

    def test_not_a_pdf(self, client):
        response = post_exams(client, b"definitely not a pdf")
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"
        assert "PDF" in response.json()["detail"]

    def test_pdf_without_table(self, client, blank_page_pdf):
        response = post_exams(client, blank_page_pdf)
        assert response.status_code == 422
        assert response.json() == {
            "error": "schedule_parse_error",
            "detail": "в PDF не найдено ни одной таблицы экзаменов",
        }

    def test_pdf_over_page_limit(self, client, over_page_limit_pdf):
        response = post_exams(client, over_page_limit_pdf)
        assert response.status_code == 422
        assert response.json() == {
            "error": "schedule_parse_error",
            "detail": "в файле 51 страниц при пределе 50",
        }


class TestEndpointsDoNotAcceptEachOthersDocuments:
    def test_lesson_schedule_sent_to_exams(self, client, chekanin_pdf):
        response = post_exams(client, chekanin_pdf)
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"

    def test_exam_schedule_sent_to_lessons(self, client, bychkova_exams_pdf):
        response = post_pdf(client, bychkova_exams_pdf)
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"


class TestBadRequest:
    def test_request_without_file(self, client):
        response = client.post("/parse")
        assert response.status_code == 400
        assert response.json()["error"] == "invalid_request"

    def test_exams_request_without_file(self, client):
        response = client.post("/parse-exams")
        assert response.status_code == 400
        assert response.json()["error"] == "invalid_request"

    def test_exams_file_over_limit(self, client):
        response = post_exams(client, b"x" * (MAX_UPLOAD_BYTES + 1))
        assert response.status_code == 413
        assert response.json()["error"] == "file_too_large"

    def test_wrong_field_name(self, client, chekanin_pdf):
        response = post_pdf(client, chekanin_pdf, field="pdf")
        assert response.status_code == 400
        assert response.json()["error"] == "invalid_request"

    def test_file_over_limit(self, client):
        response = post_pdf(client, b"x" * (MAX_UPLOAD_BYTES + 1))
        assert response.status_code == 413
        assert response.json()["error"] == "file_too_large"

    def test_file_at_limit_is_not_rejected_by_size(self, client):
        response = post_pdf(client, b"x" * MAX_UPLOAD_BYTES)
        assert response.status_code == 422
        assert response.json()["error"] == "schedule_parse_error"

    def test_oversized_content_length_is_rejected_before_parsing(self, monkeypatch, client):
        def boom(source):
            raise AssertionError("разбор не должен запускаться")

        monkeypatch.setattr(main, "parse_schedule", boom)
        response = client.post(
            "/parse",
            headers={"Content-Length": str(main.MAX_REQUEST_BYTES + 1)},
            content=b"",
        )
        assert response.status_code == 413
        assert response.json() == {
            "error": "file_too_large",
            "detail": "файл больше допустимых 5 МБ",
        }

    def test_chunked_body_over_limit_is_rejected(self, client):
        def chunks():
            for _ in range(2):
                yield b"x" * main.MAX_REQUEST_BYTES

        response = client.post(
            "/parse",
            headers={"Content-Type": "multipart/form-data; boundary=chunky"},
            content=chunks(),
        )
        assert response.status_code == 413
        assert response.json() == {
            "error": "file_too_large",
            "detail": "файл больше допустимых 5 МБ",
        }


class TestUnexpectedError:
    def test_internal_error_hides_details(self, monkeypatch, chekanin_pdf):
        def boom(source):
            raise RuntimeError("секрет из внутренностей сервиса")

        monkeypatch.setattr(main, "parse_schedule", boom)
        client = TestClient(app, raise_server_exceptions=False)
        response = post_pdf(client, chekanin_pdf)
        assert response.status_code == 500
        assert response.json() == {
            "error": "internal_error",
            "detail": "внутренняя ошибка сервиса",
        }

    def test_parse_error_from_parser_becomes_422(self, monkeypatch, client, chekanin_pdf):
        def boom(source):
            raise ScheduleParseError("подсадная ошибка формата")

        monkeypatch.setattr(main, "parse_schedule", boom)
        response = post_pdf(client, chekanin_pdf)
        assert response.status_code == 422
        assert response.json()["detail"] == "подсадная ошибка формата"

    def test_exams_internal_error_hides_details(self, monkeypatch, bychkova_exams_pdf):
        def boom(source):
            raise RuntimeError("секрет из внутренностей сервиса")

        monkeypatch.setattr(main, "parse_exams", boom)
        client = TestClient(app, raise_server_exceptions=False)
        response = post_exams(client, bychkova_exams_pdf)
        assert response.status_code == 500
        assert response.json() == {
            "error": "internal_error",
            "detail": "внутренняя ошибка сервиса",
        }

    def test_exams_parse_error_becomes_422(self, monkeypatch, client, bychkova_exams_pdf):
        def boom(source):
            raise ScheduleParseError("подсадная ошибка формата экзаменов")

        monkeypatch.setattr(main, "parse_exams", boom)
        response = post_exams(client, bychkova_exams_pdf)
        assert response.status_code == 422
        assert response.json()["detail"] == "подсадная ошибка формата экзаменов"

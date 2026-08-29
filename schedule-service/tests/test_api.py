import pytest
from fastapi.testclient import TestClient

from app import main
from app.errors import ScheduleParseError
from app.main import MAX_UPLOAD_BYTES, app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def post_pdf(client, content, field="file", filename="schedule.pdf"):
    return client.post("/parse", files={field: (filename, content, "application/pdf")})


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


class TestBadRequest:
    def test_request_without_file(self, client):
        response = client.post("/parse")
        assert response.status_code == 400
        assert response.json()["error"] == "invalid_request"

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

import logging
from typing import Annotated

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.errors import ScheduleParseError
from app.models import ParsedSchedule
from app.parser import parse_schedule

MAX_UPLOAD_BYTES = 5 * 1024 * 1024

logger = logging.getLogger(__name__)

app = FastAPI(
    title="schedule-service",
    description="Разбор PDF-расписания преподавателя СТАНКИНа",
    version="0.1.0",
)


class UploadTooLargeError(Exception):
    pass


def _error(status_code: int, error: str, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": error, "detail": detail})


@app.exception_handler(RequestValidationError)
async def _on_invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _error(400, "invalid_request", "ожидается multipart-поле file с PDF-файлом")


@app.exception_handler(UploadTooLargeError)
async def _on_upload_too_large(request: Request, exc: UploadTooLargeError) -> JSONResponse:
    limit_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
    return _error(413, "file_too_large", f"файл больше допустимых {limit_mb} МБ")


@app.exception_handler(ScheduleParseError)
async def _on_parse_error(request: Request, exc: ScheduleParseError) -> JSONResponse:
    return _error(422, "schedule_parse_error", exc.message)


@app.exception_handler(Exception)
async def _on_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("необработанная ошибка при разборе расписания")
    return _error(500, "internal_error", "внутренняя ошибка сервиса")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/parse", response_model=ParsedSchedule)
async def parse(file: Annotated[UploadFile, File()]) -> ParsedSchedule:
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise UploadTooLargeError
    return parse_schedule(content)

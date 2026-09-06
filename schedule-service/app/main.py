import logging
from typing import Annotated

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.errors import ScheduleParseError
from app.exams import parse_exams
from app.gradesheets import parse_gradesheets
from app.models import ParsedExams, ParsedGradeSheets, ParsedSchedule
from app.parser import parse_schedule

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MULTIPART_OVERHEAD_BYTES = 64 * 1024
MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES

logger = logging.getLogger(__name__)


class UploadTooLargeError(Exception):
    pass


class _RequestBodyTooLarge(Exception):
    pass


def _error(status_code: int, error: str, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": error, "detail": detail})


def _too_large_response() -> JSONResponse:
    limit_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
    return _error(413, "file_too_large", f"файл больше допустимых {limit_mb} МБ")


def _declared_content_length(scope: Scope) -> int | None:
    for name, value in scope["headers"]:
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


class BodySizeLimitMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        declared = _declared_content_length(scope)
        if declared is not None and declared > MAX_REQUEST_BYTES:
            await _too_large_response()(scope, receive, send)
            return

        received = 0
        response_started = False
        rejected = False

        async def guarded_send(message: Message) -> None:
            nonlocal response_started
            if rejected:
                return
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        async def counting_receive() -> Message:
            nonlocal received, rejected
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > MAX_REQUEST_BYTES:
                    rejected = True
                    if not response_started:
                        await _too_large_response()(scope, receive, send)
                    raise _RequestBodyTooLarge
            return message

        try:
            await self.app(scope, counting_receive, guarded_send)
        except Exception:
            if not rejected:
                raise


app = FastAPI(
    title="schedule-service",
    description="Разбор PDF-расписаний и Excel-ведомостей СТАНКИНа",
    version="0.1.0",
)
app.add_middleware(BodySizeLimitMiddleware)


@app.exception_handler(RequestValidationError)
async def _on_invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _error(400, "invalid_request", "ожидается multipart-поле file с файлом")


@app.exception_handler(UploadTooLargeError)
async def _on_upload_too_large(request: Request, exc: UploadTooLargeError) -> JSONResponse:
    return _too_large_response()


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


async def _read_upload(file: UploadFile) -> bytes:
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise UploadTooLargeError
    return content


@app.post("/parse", response_model=ParsedSchedule)
async def parse(file: Annotated[UploadFile, File()]) -> ParsedSchedule:
    return await run_in_threadpool(parse_schedule, await _read_upload(file))


@app.post("/parse-exams", response_model=ParsedExams)
async def exams(file: Annotated[UploadFile, File()]) -> ParsedExams:
    return await run_in_threadpool(parse_exams, await _read_upload(file))


@app.post("/parse-gradesheet", response_model=ParsedGradeSheets)
async def gradesheet(file: Annotated[UploadFile, File()]) -> ParsedGradeSheets:
    return await run_in_threadpool(parse_gradesheets, await _read_upload(file))

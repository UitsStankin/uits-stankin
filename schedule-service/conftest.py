import io
from pathlib import Path

import pytest
from pypdf import PdfReader, PdfWriter, Transformation

from app.parser import MAX_PAGES

FIXTURES = Path(__file__).parent / "tests" / "fixtures"


@pytest.fixture(scope="session")
def chekanin_pdf() -> bytes:
    return (FIXTURES / "chekanin-va.pdf").read_bytes()


@pytest.fixture(scope="session")
def razumovskiy_pdf() -> bytes:
    return (FIXTURES / "razumovskiy-ai.pdf").read_bytes()


@pytest.fixture(scope="session")
def ibatulin_pdf() -> bytes:
    return (FIXTURES / "ibatulin-myu.pdf").read_bytes()


@pytest.fixture(scope="session")
def two_page_pdf(chekanin_pdf, razumovskiy_pdf) -> bytes:
    writer = PdfWriter()
    for source in (chekanin_pdf, razumovskiy_pdf):
        reader = PdfReader(io.BytesIO(source))
        for page in reader.pages:
            writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.fixture(scope="session")
def blank_page_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.fixture(scope="session")
def over_page_limit_pdf() -> bytes:
    writer = PdfWriter()
    for _ in range(MAX_PAGES + 1):
        writer.add_blank_page(width=595, height=842)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.fixture(scope="session")
def bychkova_exams_pdf() -> bytes:
    return (FIXTURES / "exams-bychkova-na.pdf").read_bytes()


@pytest.fixture(scope="session")
def eliseeva_exams_pdf() -> bytes:
    return (FIXTURES / "exams-eliseeva-nv.pdf").read_bytes()


@pytest.fixture(scope="session")
def ibatulin_exams_pdf() -> bytes:
    return (FIXTURES / "exams-ibatulin-myu.pdf").read_bytes()


@pytest.fixture(scope="session")
def two_page_exams_pdf(bychkova_exams_pdf, eliseeva_exams_pdf) -> bytes:
    writer = PdfWriter()
    for source in (bychkova_exams_pdf, eliseeva_exams_pdf):
        reader = PdfReader(io.BytesIO(source))
        for page in reader.pages:
            writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.fixture(scope="session")
def overflowing_exams_pdf(ibatulin_exams_pdf) -> bytes:
    writer = PdfWriter(clone_from=io.BytesIO(ibatulin_exams_pdf))
    writer.pages[0].add_transformation(Transformation().translate(tx=24, ty=0))
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()

import io
from pathlib import Path

import pytest
from pypdf import PdfReader, PdfWriter

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

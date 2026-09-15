"""
Tests for TA-58: a representative subset of the seed corpus is
available as real PDF/DOCX/XLSX files, extractable by the app's own
extract_text(), with at least one document carrying a fake name,
email, and account number together.
"""
import json
from pathlib import Path


def test_converted_files_exist_in_all_three_formats():
    converted_dir = Path("/app/seed/documents/converted")
    assert converted_dir.exists()

    files = list(converted_dir.glob("*"))
    extensions = {f.suffix.lstrip(".") for f in files if f.suffix}
    assert "pdf" in extensions
    assert "docx" in extensions
    assert "xlsx" in extensions


def test_converted_metadata_covers_a_representative_spread():
    metadata_path = Path("/app/seed/documents/converted/converted_metadata.json")
    assert metadata_path.exists()

    data = json.loads(metadata_path.read_text())
    assert len(data) >= 15

    types_covered = {d["type"] for d in data}
    assert len(types_covered) == 5  # all 5 document types represented

    formats_covered = {d["converted_format"] for d in data}
    assert formats_covered == {"pdf", "docx", "xlsx"}


def test_pii_demo_document_is_present_and_flagged():
    metadata_path = Path("/app/seed/documents/converted/converted_metadata.json")
    data = json.loads(metadata_path.read_text())

    pii_demo = next((d for d in data if d["filename"] == "doc_004.txt"), None)
    assert pii_demo is not None, "the designated PII demo document must be in the converted subset"
    assert pii_demo["contains_pii"] is True


def test_extraction_works_against_all_three_real_formats():
    from data_pipeline.extraction.extract import extract_text

    converted_dir = Path("/app/seed/documents/converted")
    metadata = json.loads((converted_dir / "converted_metadata.json").read_text())

    checked_formats = set()
    for doc in metadata:
        fmt = doc["converted_format"]
        if fmt in checked_formats:
            continue
        file_path = converted_dir / doc["converted_filename"]
        text = extract_text(str(file_path), fmt)
        assert len(text) > 0, f"extraction produced no text for {fmt}"
        checked_formats.add(fmt)

    assert checked_formats == {"pdf", "docx", "xlsx"}

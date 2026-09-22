"""
TA-58: Converts a representative subset of the plain-text seed corpus
into REAL PDF, DOCX, and XLSX files -- the only formats the app
actually accepts. Scripted and repeatable, not manual: re-running this
produces the same selection and the same files every time.

Selection: 3 documents per document type (15 total across the 5 types),
with format assigned round-robin across the full selection so all
three formats get genuine coverage. doc_004.txt (a proposal_letter
containing a fake client name, email, and account number together) is
explicitly forced into the selection for the privacy-wall demonstration.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/convert_seed_documents.py
"""

import json
from pathlib import Path

from docx import Document as DocxDocument
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

SEED_DOCUMENTS_DIR = Path("/app/seed/documents")
OUTPUT_DIR = Path("/app/seed/documents/converted")
DOCS_PER_TYPE = 3
PII_DEMO_FILENAME = "doc_004.txt"  # has a fake name, email, AND account number together


def _select_representative_subset(metadata: list[dict]) -> list[dict]:
    by_type: dict[str, list[dict]] = {}
    for doc in metadata:
        by_type.setdefault(doc["type"], []).append(doc)

    selected = []
    for doc_type, docs in sorted(by_type.items()):
        # Prefer variety of injected_issues within each type, not three
        # copies of the same issue -- deterministic (sorted, first-seen).
        seen_issue_signatures = set()
        type_selection = []
        for doc in docs:
            signature = tuple(sorted(doc["injected_issues"])) or ("clean",)
            if signature not in seen_issue_signatures or len(type_selection) < DOCS_PER_TYPE:
                type_selection.append(doc)
                seen_issue_signatures.add(signature)
            if len(type_selection) >= DOCS_PER_TYPE:
                break
        selected.extend(type_selection)

    # Force-include the PII demo document if it wasn't already selected.
    if not any(d["filename"] == PII_DEMO_FILENAME for d in selected):
        pii_doc = next(d for d in metadata if d["filename"] == PII_DEMO_FILENAME)
        selected[0] = pii_doc  # deterministic replacement, always the same slot

    return selected


def _write_pdf(text: str, out_path: Path) -> None:
    doc = SimpleDocTemplate(str(out_path), pagesize=letter)
    styles = getSampleStyleSheet()
    story = [Paragraph(p.replace("\n", "<br/>"), styles["Normal"]) for p in text.split("\n\n") if p.strip()]
    doc.build(story)


def _write_docx(text: str, out_path: Path) -> None:
    doc = DocxDocument()
    for para in text.split("\n\n"):
        if para.strip():
            doc.add_paragraph(para.strip())
    doc.save(str(out_path))


def _write_xlsx(text: str, out_path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    for i, para in enumerate(text.split("\n\n"), start=1):
        if para.strip():
            ws.cell(row=i, column=1, value=para.strip())
    wb.save(str(out_path))


def main():
    metadata = json.loads((SEED_DOCUMENTS_DIR / "metadata.json").read_text(encoding="utf-8"))
    selected = _select_representative_subset(metadata)
    print(
        f"Selected {len(selected)} representative documents across "
        f"{len(set(d['type'] for d in selected))} document types."
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    formats = ["pdf", "docx", "xlsx"]
    converted_metadata = []

    for i, doc_meta in enumerate(selected):
        fmt = formats[i % len(formats)]
        raw_text = (SEED_DOCUMENTS_DIR / doc_meta["filename"]).read_text(encoding="utf-8")
        stem = Path(doc_meta["filename"]).stem
        out_path = OUTPUT_DIR / f"{stem}.{fmt}"

        if fmt == "pdf":
            _write_pdf(raw_text, out_path)
        elif fmt == "docx":
            _write_docx(raw_text, out_path)
        elif fmt == "xlsx":
            _write_xlsx(raw_text, out_path)

        is_pii_demo = doc_meta["filename"] == PII_DEMO_FILENAME
        print(
            f"  {doc_meta['filename']} -> {out_path.name} "
            f"[{doc_meta['type']}]{'  <-- PII demo doc' if is_pii_demo else ''}"
        )

        converted_metadata.append(
            {
                **doc_meta,
                "converted_filename": out_path.name,
                "converted_format": fmt,
            }
        )

    (OUTPUT_DIR / "converted_metadata.json").write_text(
        json.dumps(converted_metadata, indent=2), encoding="utf-8"
    )

    print(f"\nDone. {len(selected)} files written to {OUTPUT_DIR}")
    print(f"Metadata written to {OUTPUT_DIR / 'converted_metadata.json'}")


if __name__ == "__main__":
    main()

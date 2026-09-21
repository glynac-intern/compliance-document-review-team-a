import { describe, it, expect } from "vitest";
import { detectDocumentFormat } from "@/components/documents/document-viewer";

describe("document-viewer detectDocumentFormat", () => {
  it("detects PDF format from filename and type", () => {
    expect(detectDocumentFormat("brochure.pdf")).toBe("pdf");
    expect(detectDocumentFormat("report.PDF")).toBe("pdf");
    expect(detectDocumentFormat("file_without_ext", "application/pdf")).toBe("pdf");
    expect(detectDocumentFormat("quarterly_deck", "presentation")).toBe("pdf");
  });

  it("detects DOCX format from filename and type", () => {
    expect(detectDocumentFormat("commentary.docx")).toBe("docx");
    expect(detectDocumentFormat("memo.DOC")).toBe("docx");
    expect(detectDocumentFormat("draft", "docx")).toBe("docx");
    expect(detectDocumentFormat("letter", "word")).toBe("docx");
  });

  it("detects XLSX format from filename and type", () => {
    expect(detectDocumentFormat("financials.xlsx")).toBe("xlsx");
    expect(detectDocumentFormat("metrics.xls")).toBe("xlsx");
    expect(detectDocumentFormat("data", "spreadsheet")).toBe("xlsx");
    expect(detectDocumentFormat("numbers", "excel")).toBe("xlsx");
  });

  it("returns unknown when no recognizable format or extension is present", () => {
    expect(detectDocumentFormat("audio.mp3")).toBe("unknown");
    expect(detectDocumentFormat("archive.tar.gz")).toBe("unknown");
    expect(detectDocumentFormat("", "")).toBe("unknown");
    expect(detectDocumentFormat()).toBe("unknown");
  });
});

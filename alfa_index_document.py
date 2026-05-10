import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from alfa_pageindex_bridge import normalize_pageindex_output


def _is_offline_mode() -> bool:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    return (
        os.getenv("ALFA_OFFLINE", "1") == "1"
        or not key
        or key.lower() == "dummy"
    )


def run_pageindex(source_path: Path) -> None:
    cmd = [sys.executable, ".\\run_pageindex.py"]
    if source_path.suffix.lower() == ".pdf":
        cmd.extend(["--pdf_path", str(source_path)])
    elif source_path.suffix.lower() in {".md", ".markdown"}:
        cmd.extend(["--md_path", str(source_path)])
    else:
        raise ValueError("Supported input types: .pdf, .md, .markdown")

    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"run_pageindex.py failed with code {result.returncode}")


def build_offline_pdf_structure(source_path: Path, output_path: Path) -> None:
    """
    Wyciąga prawdziwą hierarchię nagłówków z PDF przez pdfminer.six.
    Heurystyka: fontsize > threshold = nagłówek.
    Fallback do pypdf gdy pdfminer niedostępny.
    """
    try:
        from pdfminer.high_level import extract_pages
        from pdfminer.layout import LTTextContainer, LTChar

        sections = []
        line_counter = 1
        total_lines = 0
        root_preview_parts = []
        root_preview_done = False

        # Zbieramy rozkład fontsize żeby ustalić próg nagłówka dynamicznie
        all_fontsizes: list[float] = []

        for page_layout in extract_pages(str(source_path)):
            for element in page_layout:
                if not isinstance(element, LTTextContainer):
                    continue
                for text_line in element:
                    line_text = text_line.get_text().strip() if hasattr(text_line, 'get_text') else ""
                    if not line_text:
                        continue
                    # Zbierz fontsize z pierwszego znaku linii
                    for char in text_line:
                        if isinstance(char, LTChar):
                            all_fontsizes.append(char.size)
                            break

        # Próg nagłówka: górne 20% fontsizów (ale min 11pt)
        if all_fontsizes:
            all_fontsizes.sort()
            threshold_idx = int(len(all_fontsizes) * 0.80)
            heading_threshold = max(11.0, all_fontsizes[threshold_idx])
        else:
            heading_threshold = 12.0

        # Drugi przebieg — ekstrakcja struktury
        for page_num, page_layout in enumerate(extract_pages(str(source_path))):
            for element in page_layout:
                if not isinstance(element, LTTextContainer):
                    continue
                for text_line in element:
                    line_text = text_line.get_text().strip() if hasattr(text_line, 'get_text') else ""
                    if not line_text:
                        continue

                    total_lines += 1

                    # Root preview z pierwszej strony
                    if page_num == 0 and not root_preview_done:
                        root_preview_parts.append(line_text)
                        if sum(len(p) for p in root_preview_parts) >= 4000:
                            root_preview_done = True

                    # Sprawdź fontsize
                    line_fontsize = 0.0
                    is_bold = False
                    for char in text_line:
                        if isinstance(char, LTChar):
                            line_fontsize = char.size
                            # bold heurystyka: nazwa fontu zawiera Bold
                            if hasattr(char, 'fontname') and 'Bold' in (char.fontname or ''):
                                is_bold = True
                            break

                    is_heading = (
                        line_fontsize >= heading_threshold
                        and len(line_text) >= 3
                        and len(line_text) <= 120
                        and not line_text.endswith(',')
                    ) or (
                        is_bold
                        and len(line_text) >= 3
                        and len(line_text) <= 80
                        and not line_text.endswith('.')
                    )

                    if is_heading:
                        # Poziom na podstawie fontsizea
                        if line_fontsize >= heading_threshold * 1.3:
                            level = 2
                        elif line_fontsize >= heading_threshold * 1.1:
                            level = 3
                        else:
                            level = 4

                        sections.append({
                            "title": line_text,
                            "level": level,
                            "line_num": line_counter,
                            "content_preview": line_text,
                            "fontsize": round(line_fontsize, 1),
                        })

                    line_counter += 1

        root_preview = "\n".join(root_preview_parts)[:4000]

    except ImportError:
        heading_threshold = 0.0
        # Fallback do pypdf gdy pdfminer niedostępny
        print("pdfminer.six niedostępny — fallback do pypdf")
        from pypdf import PdfReader
        reader = PdfReader(str(source_path))
        sections = []
        line_counter = 1
        total_lines = 0
        root_preview = ""
        try:
            root_preview = (reader.pages[0].extract_text() or "")[:4000]
        except Exception:
            pass

        for page in reader.pages:
            text = page.extract_text() or ""
            lines = text.split("\n")
            total_lines += len(lines)
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                is_heading = (
                    len(stripped) <= 80
                    and not stripped.endswith(".")
                    and len(stripped) >= 4
                    and stripped[0].isupper()
                )
                if is_heading:
                    sections.append({
                        "title": stripped,
                        "level": 2 if len(stripped) <= 40 else 3,
                        "line_num": line_counter,
                        "content_preview": stripped,
                    })
                line_counter += 1

    # Root zawsze jako sekcja nadrzędna
    root = {
        "title": "Root",
        "level": 1,
        "line_num": 1,
        "content_preview": root_preview,
        "fallback_reason": "pdf_pdfminer_offline_extraction",
    }

    # Root + max 30 sekcji (więcej niż pypdf fallback bo jakość lepsza)
    all_sections = [root] + sections[:200]

    structure = {
        "structure": all_sections,
        "line_count": max(1, total_lines),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(structure, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"pdfminer extraction: {len(sections)} sekcji wykrytych (próg fontsize: {heading_threshold:.1f}pt)")


def main() -> int:
    parser = argparse.ArgumentParser(description="ALFA wrapper: PageIndex -> section map")
    parser.add_argument("--pdf_path", type=str, help="Path to PDF input")
    parser.add_argument("--md_path", type=str, help="Path to Markdown input")
    parser.add_argument("--results_dir", type=str, default=".\\results", help="Output directory")
    args = parser.parse_args()

    if bool(args.pdf_path) == bool(args.md_path):
        print("Provide exactly one of --pdf_path or --md_path")
        return 2

    source = Path(args.pdf_path or args.md_path)
    if not source.exists():
        print(f"Source file not found: {source}")
        return 2

    results_dir = Path(args.results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)

    stem = source.stem
    structure_path = results_dir / f"{stem}_structure.json"
    section_map_path = results_dir / f"{stem}_alfa_section_map.json"

    if source.suffix.lower() == ".pdf" and _is_offline_mode():
        print("ALFA_OFFLINE_MODE: true")
        print("ALFA_OFFLINE_PDF_FALLBACK: skipping run_pageindex (offline mode)")
        try:
            build_offline_pdf_structure(source, structure_path)
        except Exception as exc:
            print(f"pdfminer fallback failed: {exc}")
            return 1
    else:
        try:
            run_pageindex(source)
        except RuntimeError:
            if source.suffix.lower() == ".pdf":
                print("ALFA_OFFLINE_PDF_FALLBACK: run_pageindex failed, using pdfminer extraction")
                try:
                    build_offline_pdf_structure(source, structure_path)
                except Exception as exc:
                    print(f"pdfminer fallback failed: {exc}")
                    return 1
            else:
                raise

    if not structure_path.exists():
        print(f"Expected structure file not found: {structure_path}")
        return 1

    normalize_pageindex_output(
        input_json=str(structure_path),
        output_json=str(section_map_path),
        source_path=str(source),
    )

    print("ALFA_INDEX_DONE")
    print(f"source: {source}")
    print(f"structure_json: {structure_path}")
    print(f"section_map_json: {section_map_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())



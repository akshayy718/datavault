"""
SpreadsheetService -- turns an uploaded file's raw bytes into the
(schema, rows) shape that Dataset/DatasetRow expect.

MVP scope decision (per the Implementation Plan, Phase 1, and the
architecture's Background Job System note): this runs synchronously,
in the request itself. Large-file handling via a background job queue
is explicitly deferred to Phase 2-3 -- doing that now, before there's a
single real user, would be solving a problem that doesn't exist yet.
"""
import csv
import io

import openpyxl


class SpreadsheetParseError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def parse_spreadsheet(filename: str, file_bytes: bytes) -> tuple[list[str], list[dict]]:
    """
    Returns (columns, rows) where columns is a list of header names and
    rows is a list of dicts keyed by those headers -- the same shape
    regardless of whether the source was .csv or .xlsx, which is exactly
    the point: everything downstream (DatasetRow.row_data) never needs to
    know which format the file originally was.
    """
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        return _parse_csv(file_bytes)
    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        return _parse_xlsx(file_bytes)
    else:
        raise SpreadsheetParseError(
            f"Unsupported file type for '{filename}'. Only .csv and .xlsx are supported."
        )


def _parse_csv(file_bytes: bytes) -> tuple[list[str], list[dict]]:
    try:
        text = file_bytes.decode("utf-8-sig")  # handles a leading BOM from Excel-exported CSVs
    except UnicodeDecodeError as exc:
        raise SpreadsheetParseError(f"Could not decode CSV as UTF-8: {exc}") from exc

    reader = csv.DictReader(io.StringIO(text))
    columns = reader.fieldnames
    if not columns:
        raise SpreadsheetParseError("CSV file has no header row, or is empty.")
    rows = list(reader)
    return list(columns), rows


def _parse_xlsx(file_bytes: bytes) -> tuple[list[str], list[dict]]:
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    except Exception as exc:
        raise SpreadsheetParseError(f"Could not read XLSX file: {exc}") from exc

    sheet = workbook.active  # MVP: first sheet only -- multi-sheet selection is a later-phase feature
    rows_iter = sheet.iter_rows(values_only=True)

    try:
        header_row = next(rows_iter)
    except StopIteration:
        raise SpreadsheetParseError("XLSX file is empty.")

    columns = [str(c) if c is not None else f"Column{i+1}" for i, c in enumerate(header_row)]
    if not columns:
        raise SpreadsheetParseError("XLSX file has no header row.")

    rows = []
    for raw_row in rows_iter:
        if all(cell is None for cell in raw_row):
            continue  # skip fully blank rows rather than storing empty records
        row_dict = {}
        for col_name, cell_value in zip(columns, raw_row):
            row_dict[col_name] = "" if cell_value is None else str(cell_value)
        rows.append(row_dict)

    return columns, rows

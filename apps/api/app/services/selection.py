"""
Selection extraction -- turns (selection_type, selection_spec) + a
dataset's rows into the actual data a share should show.

This is deliberately separate from ShareService because it's used in two
different moments that must behave identically: once when a Snapshot
share is created (to freeze the data), and again every time a Live share
is viewed (to read it fresh). Keeping one function for "what does this
selection mean" guarantees Snapshot and Live never silently disagree on
how a selection is interpreted -- only on *when* it's evaluated.
"""


class SelectionError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def extract_selection(rows: list[dict], selection_type: str, selection_spec: dict) -> dict:
    """
    Returns either:
      {"kind": "single", "fields": {...}}                  -- cell, row
      {"kind": "multi", "items": [{...}, {...}, ...]}       -- column, range, filter
    """
    if selection_type == "row":
        idx = selection_spec.get("row_index")
        if idx is None or not (0 <= idx < len(rows)):
            raise SelectionError(f"row_index {idx} is out of range for this dataset.")
        return {"kind": "single", "fields": rows[idx]}

    if selection_type == "cell":
        idx = selection_spec.get("row_index")
        column = selection_spec.get("column")
        if idx is None or not (0 <= idx < len(rows)):
            raise SelectionError(f"row_index {idx} is out of range for this dataset.")
        if column is None or column not in rows[idx]:
            raise SelectionError(f"Column '{column}' does not exist in this dataset.")
        return {"kind": "single", "fields": {column: rows[idx][column]}}

    if selection_type == "column":
        # Supports BOTH single-column and multi-column selection:
        #   {"column": "Name"}                       -> one column (legacy)
        #   {"columns": ["Name", "Email", "Title"]}  -> several columns
        # When the user picks multiple columns in the UI, we want each row to
        # keep ALL of those columns (not just the first) -- that's what makes
        # "I selected Name, Department, Title, Email" actually show all four.
        columns = selection_spec.get("columns")
        single = selection_spec.get("column")

        if columns:  # multi-column path
            if not rows:
                raise SelectionError("This dataset has no rows to select from.")
            missing = [c for c in columns if c not in rows[0]]
            if missing:
                raise SelectionError(f"Column(s) {missing} do not exist in this dataset.")
            # For each row, keep only the selected columns, in the chosen order
            return {"kind": "multi", "items": [{c: r[c] for c in columns} for r in rows]}

        # single-column path (unchanged, keeps old shares working)
        if not rows or single not in rows[0]:
            raise SelectionError(f"Column '{single}' does not exist in this dataset.")
        return {"kind": "multi", "items": [{single: r[single]} for r in rows]}

    if selection_type == "range":
        indices = selection_spec.get("row_indices", [])
        if not indices or any(not (0 <= i < len(rows)) for i in indices):
            raise SelectionError("One or more row_indices are out of range for this dataset.")
        return {"kind": "multi", "items": [rows[i] for i in indices]}

    if selection_type == "filter":
        condition = selection_spec.get("filter", {})
        column = condition.get("column")
        operator = condition.get("operator", "equals")
        value = condition.get("value")
        if not rows or column not in rows[0]:
            raise SelectionError(f"Column '{column}' does not exist in this dataset.")

        def matches(row: dict) -> bool:
            cell = row.get(column)
            if operator == "equals":
                return str(cell) == str(value)
            if operator == "contains":
                return str(value).lower() in str(cell).lower()
            raise SelectionError(f"Unsupported filter operator: '{operator}'.")

        return {"kind": "multi", "items": [r for r in rows if matches(r)]}

    raise SelectionError(f"Unsupported selection_type: '{selection_type}'.")

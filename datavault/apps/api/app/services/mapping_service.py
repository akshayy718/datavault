"""
MappingService -- the auto-mapping heuristic, in one place.

This was originally duplicated inline in app/seed.py. Extracted here so
seed.py and the real upload endpoint use the exact same logic -- two
copies of "guess which column is the title" drifting apart over time is
exactly the kind of small inconsistency that causes confusing bugs later
("why does the seed data look different from data I upload myself?").
"""


def auto_generate_mapping(columns: list[str]) -> dict:
    """
    Simple, deliberately limited heuristic (per the MVP scope decision in
    the PRD: full manual mapping is Advanced/Phase 5, this is just enough
    to make Cards-format shares look reasonable for the common case).
    Matches common column names to presentation roles.
    """
    lower = {c.lower(): c for c in columns}
    mapping = {}
    if "name" in lower or "title" in lower:
        mapping["Title"] = lower.get("name") or lower.get("title")
    if "photo" in lower or "avatar" in lower:
        mapping["Avatar"] = lower.get("photo") or lower.get("avatar")
    if "department" in lower or "subtitle" in lower:
        mapping["Subtitle"] = lower.get("department") or lower.get("subtitle")
    return mapping

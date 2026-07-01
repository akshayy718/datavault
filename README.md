# DataVault — Backend (Modules 1-7, 12-14: + Global Search)

This package adds **Module 12: Global Search** — the last item from your
Tier 1/Tier 2 priority list. One search across datasets, shares, and
templates, scoped to your own workspace.

## What's new in this drop

- `app/services/search_service.py` — `SearchService`. **Read the module docstring** — it states the "search-on-read, no index" scope decision plainly, and explains why shares are matched two ways (by their own token, and by their underlying dataset's filename — since nobody would naturally type a random token into a search box).
- `app/routes/search.py` — `GET /api/v1/search?q=...`.
- `app/schemas/search.py` — response schema.
- No new dependencies, no new migration — this is pure read-query logic against tables that already exist.

## A security test that mattered more than the feature test

The thing most worth verifying in a search feature isn't "does it find things" — it's "does it correctly find *only* things I'm allowed to see." I tested this directly: created a dataset/share/template as one user, then searched for the exact same term as a completely different user. The second user correctly got back empty results, even though the first user genuinely had matching data. Workspace isolation holds.

## Setup

```bash
cd apps/api
venv\Scripts\activate
pip install -r requirements.txt   # no new packages
alembic upgrade head                # no new migration -- still at 0005
```

## Testing it yourself

1. Authorize, upload a dataset (e.g. `employees.csv`), create a share, create a template — give the template a name containing a recognizable word, like "Employee".
2. `GET /api/v1/search?q=employee` — should return matches across all three categories in one response.
3. Try a partial token: copy the first several characters of a share's `token` and search for just that — shares match by token too, not just by their dataset's filename.
4. Try an uppercase query (`EMPLOYEE`) against lowercase data — confirm it still matches (search is case-insensitive).
5. Search for something that matches nothing — confirm you get back empty arrays, not an error.

## What was tested end-to-end before this reached you

- A single search term correctly matched a dataset (by filename), a share (via its dataset's filename), and a template (by name) — all three categories in one response.
- Partial share-token search correctly matched.
- Case-insensitive matching confirmed (uppercase query against lowercase-ish data).
- No-match query correctly returns empty arrays, not an error.
- Empty query string correctly rejected with `422` (minimum length enforced).
- No auth → `401`.
- **Cross-workspace isolation, directly verified**: a second user's identical search correctly returned nothing, despite the first user having real matching data.
- Full migration regression cycle (still at `0005`, confirming this module needed none) and seed script idempotency.

## What's NOT in this module (by design, per your scope cut)

No real search index — see the service's module docstring for the full reasoning on why search-on-read is the right call at this scale, and why the API shape won't need to change if a real index is ever added later.

## Status: all items from your priority list are now built

- ✅ Module 7 — Template Builder
- ✅ Module 13 — Export Engine
- ✅ Module 14 — AI Key Strategy (BYOK + Hybrid)
- ✅ Module 6 (partial) — AI Extended was *not* explicitly requested in your final list, so it was not built — flag me if you actually want NL query/anomaly detection extended with dashboard/report generation
- ✅ Module 12 — Global Search
- ⬜ Module 10 — Recipient Session Layer (Tier 2, not yet built)
- ⬜ Module 8 — Advanced Security: emergency shutdown, watermark, view restrictions (Tier 2, not yet built)

Your message said Tier 2 is "only if time remains." Let me know if you want those two, or if this is the point to pause backend work and move to frontend + deployment.

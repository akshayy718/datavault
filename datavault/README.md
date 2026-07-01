# DataVault — Backend (Modules 1-5: Database + Auth + QR/Sharing + Analytics + AI)

This package adds **Module 5: AI Copilot** — natural language querying and
anomaly detection over your datasets, with the advisory-only and
cost-tracking guardrails from the PRD built in from day one.

## ⚠️ Important: what I could and couldn't test myself

My sandbox cannot use a real API key (I don't have one, and Groq's
service is meant to be used with your own account). So, unlike every
previous module, **I cannot claim this was fully tested end-to-end with a
real AI response** — that part needs your own Groq API key.

Here's exactly what I did verify, precisely, so you know what's actually
proven versus what's still on you to confirm:

- **The "no API key configured" path is genuinely tested** — not mocked.
  I ran the real endpoints with no key set and got the real `503` error
  with a clear, actionable message. This is exactly what you'll see if
  you don't set up a key.
- **The network call mechanism itself reached Groq's real servers.** I
  tested with a deliberately invalid key and got back a real `403
  Forbidden` from Groq's API, which my error handling caught correctly.
  This proves the HTTP plumbing is correct — the only missing piece is a
  *valid* key.
- **The entire pipeline around the AI call was tested with the network
  call mocked** — 6 separate test cases covering: a valid AI response
  correctly filtering and returning real matching rows (3 Engineering
  employees, verified by name), an AI "hallucinating" a column that
  doesn't exist being correctly rejected, markdown-fenced JSON (a common
  real-world AI quirk) being correctly stripped and parsed, an invalid
  operator being rejected, anomaly detection structuring its output
  correctly, and usage tracking correctly accumulating across both
  successful and failed calls.

**What you need to do to fully confirm this module:** get a free API key
from console.groq.com (you've used Groq before in past projects, so this
should be familiar), set `AI_PROVIDER_API_KEY` in your `.env`, restart the
server, and try a real query. I'm confident in the logic because of the
mocked tests above, but a real call is the only way to know for certain.

## What's new in this drop

- `app/models/ai_usage.py` — `AIUsageLog`, append-only cost tracking.
- `app/services/ai_service.py` — the AI layer itself. **Read the module docstring at the top of this file** — it states the core safety design plainly: the AI never receives raw row data for queries (only column names), its output is validated against the real schema before being executed by the same tested filter logic `ShareService` already uses, and anomaly detection is called out as the one documented exception where real data is sent.
- `app/routes/ai.py` — `POST /api/v1/ai/query`, `POST /api/v1/ai/anomalies`, `GET /api/v1/ai/usage`.
- `app/schemas/ai.py` — request/response models.
- `migrations/versions/0004_add_ai_usage_logs_table.py`.

## A deliberate MVP scope decision, stated plainly

This module implements **NL query and anomaly detection only**. Dashboard
generation, report generation, and data cleanup (which needs its own
careful advisory-only apply/reject flow) are explicitly deferred — same
"ship a focused, fully-tested slice" discipline as every prior module.

**Also deferred:** the full BYOK/hybrid AI key system from the PRD. This
module uses a single platform-managed key from your own `.env` only —
exactly matching the PRD's roadmap, where BYOK/hybrid key switching is
explicitly Phase 7, not MVP.

## A real design decision worth understanding (not a bug, but important)

**`AIUsageLog` tracks by `user_id`, not `organization_id`** — a deliberate
deviation from the original Database Design doc's schema (which is
correct for the eventual multi-tenant system). This matches the same
"one user = one org = one workspace" simplification used everywhere else
in this codebase since Module 3. Moving to org-level tracking later is a
column addition plus a join, not a redesign.

## Setup

```bash
cd apps/api
venv\Scripts\activate
pip install -r requirements.txt   # no new packages -- uses the existing `requests` library
alembic upgrade head                # applies migration 0004
```

**To actually use the AI features**, add to your `.env`:
```
AI_PROVIDER_API_KEY=your_real_groq_key_here
```
(The `AI_PROVIDER_BASE_URL` and `AI_PROVIDER_MODEL` lines in `.env.example`
already have sensible defaults — you only need to add the key itself.)

## Testing it yourself

**Without a key** (proves the graceful-failure path):
1. `POST /api/v1/ai/query` with any dataset_id and query — expect `503`
   with a message telling you to set `AI_PROVIDER_API_KEY`.

**With a real key** (the part only you can confirm):
1. Add your key to `.env`, restart the server.
2. Upload `employees.csv` if you haven't already, get its `dataset_id`.
3. `POST /api/v1/ai/query`:
   ```json
   {
     "dataset_id": "<your dataset id>",
     "query": "show me everyone in Engineering"
   }
   ```
   Expect back the AI's `interpreted_filter` (so you can see exactly what
   it understood) plus `result_rows` — should be Aisha Rahman, Mei Lin,
   and Priya Nair, the three Engineering employees.
4. Try a deliberately ambiguous or odd query and see how it handles it —
   e.g., "who works in sales" should use `contains` or `equals` against
   the Department column correctly.
5. `POST /api/v1/ai/anomalies` with the same dataset_id — the 8-row
   employee dataset is small and clean, so it may return an empty array,
   which is the correct behavior, not a failure.
6. `GET /api/v1/ai/usage` — confirm real token counts and cost estimates
   appear, reflecting your actual calls.

## What was tested end-to-end before this reached you

- App boots correctly with all 3 new AI routes registered.
- Full `upgrade → downgrade → upgrade` cycle across all 4 migrations, clean both directions.
- Real `503` for missing API key (genuinely tested, not mocked).
- Real `403` from Groq's actual servers when using an invalid key (proves the HTTP path works).
- 6 mocked pipeline tests covering valid filtering, hallucinated-column rejection, markdown-fence handling, invalid-operator rejection, anomaly detection structure, and usage tracking across success/failure.
- 404 for nonexistent dataset, 401 for missing auth.
- Seed script still works and is still idempotent.

## Next module (pending your approval)

**Module 6: Mobile** — per the Implementation Plan, this is scoped to the
recipient-side experience (QR scanner, recently-viewed list, optional
save-for-later), not a full mobile rebuild of the owner dashboard.

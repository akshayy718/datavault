"""
AIService -- the AI Copilot layer.

CORE SAFETY DESIGN (read this before touching this file):

1. For natural-language QUERY, the AI never receives raw row data --
   only the dataset's column names (the schema). Its one job is to
   translate a plain-language request into a STRUCTURED FILTER
   ({"column": ..., "operator": ..., "value": ...}), not to answer the
   question itself. That filter is then validated against the REAL
   schema (the column must actually exist) and executed by our own,
   already-tested filtering logic (app/services/selection.py -- the
   exact same code path ShareService uses for filter-based shares).
   The AI never queries the database directly, at any point, ever.

2. Every call -- success or failure -- writes an AIUsageLog row before
   returning. Cost visibility is not an afterthought bolted on later;
   per the PRD's explicit sequencing decision, it ships with the AI
   layer itself.

3. DOCUMENTED EXCEPTION to rule #1: anomaly detection genuinely requires
   the AI to see actual row data -- spotting a likely duplicate or an
   outlier isn't possible from column names alone. This is called out
   explicitly, not buried, because it's the one place in this service
   where "the AI never sees raw data" doesn't hold. Row counts sent are
   capped (see _MAX_ANOMALY_ROWS) to bound both cost and exposure.

4. MVP scope, stated plainly: this module implements NL query and
   anomaly detection only. Dashboard/report generation and data cleanup
   (with its required advisory-only apply/reject flow) are explicitly
   deferred -- per the same "ship a focused, fully-tested slice rather
   than a wide, half-tested one" discipline used throughout this build.
"""
import json
import re

import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_usage import AIUsageLog
from app.models.dataset import Dataset, DatasetRow
from app.services.selection import SelectionError, extract_selection

_MAX_ANOMALY_ROWS = 50  # cap what's ever sent to the AI provider for anomaly detection

# Groq's pricing varies by model; this is a deliberately rough estimate
# (roughly in the ballpark of Llama 3.3 70B's per-token cost at the time
# of writing), clearly labeled as an estimate everywhere it's surfaced --
# never presented as exact billing. Good enough for relative cost
# awareness ("query A cost more than query B"), not for an invoice.
_ESTIMATED_COST_PER_TOKEN = 0.0000007


class AIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _call_ai_provider(system_prompt: str, user_prompt: str) -> tuple[str, int]:
    """
    The ONLY function in this codebase that talks to the AI provider.
    Returns (response_text, tokens_used). Raises AIError on any failure
    -- missing key, network failure, non-2xx response -- so callers
    never need to know the transport details.
    """
    if not settings.ai_provider_api_key:
        raise AIError(
            "AI is not configured. Set AI_PROVIDER_API_KEY in your .env "
            "(a free Groq API key from console.groq.com works) to enable AI features.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.ai_provider_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.ai_provider_api_key}"},
            json={
                "model": settings.ai_provider_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0,  # we want a precise, repeatable filter -- not creative variation
            },
            timeout=20,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise AIError(f"AI provider request failed: {exc}", status_code=503) from exc

    payload = response.json()
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise AIError("AI provider returned an unexpected response shape.", status_code=502) from exc

    tokens_used = payload.get("usage", {}).get("total_tokens", 0)
    return content, tokens_used


def _extract_json(text: str) -> dict | list:
    """
    AI providers frequently wrap JSON in markdown code fences
    (```json ... ```) even when explicitly told not to. Strip that
    before parsing rather than failing on otherwise-valid output.
    """
    stripped = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", stripped, re.DOTALL)
    if fence_match:
        stripped = fence_match.group(1)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise AIError(f"AI did not return valid JSON: {exc}", status_code=502) from exc


class AIService:
    def __init__(self, db: Session):
        self.db = db

    # ---- Natural language query ----

    def query_natural_language(self, dataset_id: str, user_id: str, query_text: str) -> dict:
        dataset = self._get_owned_dataset(dataset_id, user_id)
        columns = [c["column_name"] for c in dataset.schema_definition]

        system_prompt = (
            "You are a query translator for a spreadsheet filtering system. "
            "Given a list of column names and a natural language request, "
            "respond with ONLY a JSON object in this exact shape, no other text, "
            "no markdown, no explanation:\n"
            '{"column": "<exact column name from the list>", '
            '"operator": "equals" or "contains", "value": "<value to match>"}\n'
            "Use the column name EXACTLY as given in the list. "
            'If the request implies an exact match, use "equals". '
            'If it implies a partial or text match, use "contains".'
        )
        user_prompt = f"Columns: {columns}\nRequest: {query_text}"

        succeeded = True
        tokens_used = 0
        try:
            content, tokens_used = _call_ai_provider(system_prompt, user_prompt)
            parsed = _extract_json(content)

            if not isinstance(parsed, dict) or "column" not in parsed or "operator" not in parsed:
                raise AIError("AI response was missing required filter fields.", status_code=502)

            if parsed["column"] not in columns:
                raise AIError(
                    f"AI chose column '{parsed['column']}', which doesn't exist in this dataset. "
                    f"Available columns: {columns}",
                    status_code=422,
                )
            if parsed.get("operator") not in ("equals", "contains"):
                raise AIError(f"AI chose an unsupported operator: '{parsed.get('operator')}'.", status_code=422)

            rows = self._load_rows(dataset_id)
            try:
                extracted = extract_selection(rows, "filter", {"filter": parsed})
            except SelectionError as exc:
                raise AIError(exc.message, status_code=422) from exc

            return {
                "interpreted_filter": parsed,
                "result_rows": extracted["items"],
                "row_count": len(extracted["items"]),
            }
        except AIError:
            succeeded = False
            raise
        finally:
            self._log_usage(user_id, "nl_query", tokens_used, succeeded)

    # ---- Anomaly detection ----
    # DOCUMENTED EXCEPTION: this sends real row data to the AI provider.
    # See this file's module docstring, point 3.

    def detect_anomalies(self, dataset_id: str, user_id: str) -> dict:
        dataset = self._get_owned_dataset(dataset_id, user_id)
        rows = self._load_rows(dataset_id)[:_MAX_ANOMALY_ROWS]

        system_prompt = (
            "You review spreadsheet data for likely duplicates, outliers, or "
            "inconsistent entries. Given a JSON array of rows (each with a "
            "row_index), respond with ONLY a JSON array, no other text, no "
            "markdown, in this exact shape:\n"
            '[{"row_index": <int>, "reason": "<short plain-language explanation>"}]\n'
            "Only include rows you genuinely consider anomalous. If none are "
            "anomalous, return an empty array []."
        )
        indexed_rows = [{"row_index": i, **r} for i, r in enumerate(rows)]
        user_prompt = json.dumps(indexed_rows)

        succeeded = True
        tokens_used = 0
        try:
            content, tokens_used = _call_ai_provider(system_prompt, user_prompt)
            parsed = _extract_json(content)
            if not isinstance(parsed, list):
                raise AIError("AI response was not a JSON array as expected.", status_code=502)

            anomalies = []
            for item in parsed:
                if isinstance(item, dict) and "row_index" in item:
                    anomalies.append({
                        "row_index": item["row_index"],
                        "reason": item.get("reason", ""),
                    })

            return {"anomalies": anomalies, "rows_reviewed": len(rows)}
        except AIError:
            succeeded = False
            raise
        finally:
            self._log_usage(user_id, "anomaly_detection", tokens_used, succeeded)

    # ---- Usage / cost visibility ----

    def get_usage(self, user_id: str) -> dict:
        logs = self.db.query(AIUsageLog).filter(AIUsageLog.user_id == user_id).all()
        total_tokens = sum(l.tokens_used for l in logs)
        total_cost = sum(float(l.estimated_cost) for l in logs)

        by_feature: dict[str, dict] = {}
        for log in logs:
            entry = by_feature.setdefault(log.feature, {"calls": 0, "tokens": 0, "estimated_cost": 0.0})
            entry["calls"] += 1
            entry["tokens"] += log.tokens_used
            entry["estimated_cost"] += float(log.estimated_cost)

        return {
            "total_calls": len(logs),
            "total_tokens": total_tokens,
            "total_estimated_cost": round(total_cost, 6),
            "by_feature": by_feature,
        }

    # ---- Shared helpers ----

    def _get_owned_dataset(self, dataset_id: str, user_id: str) -> Dataset:
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.deleted_at.is_(None)).first()
        if not dataset:
            raise AIError("Dataset not found.", status_code=404)
        if dataset.owner_id != user_id:
            raise AIError("You don't have access to this dataset.", status_code=403)
        return dataset

    def _load_rows(self, dataset_id: str) -> list[dict]:
        rows = (
            self.db.query(DatasetRow)
            .filter(DatasetRow.dataset_id == dataset_id)
            .order_by(DatasetRow.row_index)
            .all()
        )
        return [r.row_data for r in rows]

    def _log_usage(self, user_id: str, feature: str, tokens_used: int, succeeded: bool) -> None:
        self.db.add(AIUsageLog(
            user_id=user_id,
            feature=feature,
            tokens_used=tokens_used,
            estimated_cost=round(tokens_used * _ESTIMATED_COST_PER_TOKEN, 6),
            succeeded=succeeded,
        ))
        self.db.commit()

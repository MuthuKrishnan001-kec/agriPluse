import os
import requests
from requests.exceptions import RequestException

GROK_API_KEY = os.environ.get("GROK_API_KEY")
GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROK_MODEL = os.environ.get("GROK_MODEL", "grok-4")

SYSTEM_PROMPT = (
    "You are agriPulse's farm data advisor. You help farmers understand their "
    "agricultural data in plain, practical language. Avoid jargon and SQL "
    "terms. When given data summaries (crops, yields, rainfall, soil type, "
    "prices, etc.), point out the most useful, actionable takeaways for a "
    "farmer: trends, risks, opportunities. Keep responses concise and "
    "conversational, using short paragraphs or bullet points. If the data is "
    "insufficient to answer confidently, say so honestly rather than guessing."
)


def _call_grok(messages: list, max_tokens: int = 500) -> str:
    if not GROK_API_KEY:
        raise ValueError("GROK_API_KEY is not configured on the server.")

    try:
        resp = requests.post(
            GROK_API_URL,
            headers={
                "Authorization": f"Bearer {GROK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROK_MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.4,
            },
            timeout=30,
        )
    except RequestException as exc:
        raise ValueError(f"Failed to reach Grok API: {exc}") from exc

    try:
        data = resp.json()
    except ValueError:
        raise ValueError(
            f"Grok API returned invalid JSON (status {resp.status_code})."
        )

    if resp.status_code != 200:
        api_error = data.get("error") or data.get("message") or data.get("code")
        raise ValueError(
            f"Grok API error ({resp.status_code}): {api_error or resp.text}"
        )

    choices = data.get("choices")
    if not choices or not isinstance(choices, list):
        raise ValueError("Grok API returned no response choices.")

    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    content = message.get("content")
    if not isinstance(content, str):
        raise ValueError("Grok API returned an unexpected chat response format.")

    return content.strip()


def get_insights(dataset: str, table: str, schema: dict, summary: list, filters: dict | None = None) -> str:
    context = {
        "dataset": dataset,
        "table": table,
        "row_count": schema.get("num_rows"),
        "columns": [c["name"] for c in schema.get("fields", [])],
        "column_summary": summary,
        "active_filters": filters or {},
    }
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Here is a summary of the farm data currently being viewed:\n{context}\n\n"
                "What are the most useful insights or suggestions for the farmer looking at this?"
            ),
        },
    ]
    return _call_grok(messages)


def chat(history: list, context: dict | None = None) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        messages.append({"role": "system", "content": f"Current data context: {context}"})
    messages.extend(history)
    return _call_grok(messages)
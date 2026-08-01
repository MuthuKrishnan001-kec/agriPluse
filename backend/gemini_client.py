import os

import requests
from requests.exceptions import RequestException

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

SYSTEM_PROMPT = (
    "You are agriPulse's farm data advisor. You help farmers understand their "
    "agricultural data in plain, practical language. Avoid jargon and SQL "
    "terms. When given data summaries (crops, yields, rainfall, soil type, "
    "prices, etc.), point out the most useful, actionable takeaways for a "
    "farmer: trends, risks, opportunities. Keep responses concise and "
    "conversational, using short paragraphs or bullet points. If the data is "
    "insufficient to answer confidently, say so honestly rather than guessing."
)


def _to_gemini_contents(messages: list) -> list:
    contents = []
    for message in messages:
        role = "model" if message.get("role") in {"assistant", "model"} else "user"
        contents.append({"role": role, "parts": [{"text": message.get("content", "")}]})
    return contents


def _call_gemini(messages: list, max_tokens: int = 500) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured on the server.")

    system_messages = [
        message["content"] for message in messages if message.get("role") == "system"
    ]
    system_instruction = "\n\n".join(system_messages) or SYSTEM_PROMPT
    contents = _to_gemini_contents(
        [message for message in messages if message.get("role") != "system"]
    )

    try:
        resp = requests.post(
            GEMINI_API_URL,
            params={"key": GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json={
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": contents,
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.4},
            },
            timeout=30,
        )
    except RequestException as exc:
        raise ValueError(f"Failed to reach Gemini API: {exc}") from exc

    try:
        data = resp.json()
    except ValueError as exc:
        raise ValueError(f"Gemini API returned invalid JSON (status {resp.status_code}).") from exc

    if resp.status_code != 200:
        api_error = data.get("error", {}).get("message") or data.get("message")
        raise ValueError(f"Gemini API error ({resp.status_code}): {api_error or resp.text}")

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Gemini API returned an unexpected response format.") from exc


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
    return _call_gemini(messages)


def chat(history: list, context: dict | None = None) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        messages.append({"role": "system", "content": f"Current data context: {context}"})
    messages.extend(history)
    return _call_gemini(messages)

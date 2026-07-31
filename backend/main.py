import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import bq_client as bq
from grok_client import get_insights, chat as grok_chat

app = FastAPI(title="BigQuery Dashboard API")

# ---------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------
raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins = [
    origin.strip() for origin in raw_origins.split(",") if origin.strip()
]

default_origins = [
    "https://agri-pluse.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
]

for origin in default_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Vite may select any available local port. Vercel preview URLs change
    # per deployment, so allow that controlled domain family as well. The
    # production URL still belongs in ALLOWED_ORIGINS on Render.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Models & Routes
# ---------------------------------------------------------
class QueryBody(BaseModel):
    sql: str
    max_rows: int = 1000


class InsightsBody(BaseModel):
    dataset: str
    table: str
    filters: dict | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatBody(BaseModel):
    messages: list[ChatMessage]
    dataset: str | None = None
    table: str | None = None


@app.get("/")
def root():
    """Root route to prevent 404s on general health pings."""
    return {"status": "ok", "message": "BigQuery Dashboard API is running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/datasets")
def datasets():
    try:
        return {"datasets": bq.list_datasets()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/{dataset_id}/tables")
def tables(dataset_id: str):
    try:
        return {"tables": bq.list_tables(dataset_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/{dataset_id}/tables/{table_id}/schema")
def schema(dataset_id: str, table_id: str):
    try:
        return bq.get_schema(dataset_id, table_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/{dataset_id}/tables/{table_id}/data")
def table_data(
    dataset_id: str,
    table_id: str,
    limit: int = Query(100, le=5000),
    offset: int = Query(0, ge=0),
    order_by: str | None = None,
    order_dir: str = "ASC",
    zone: str | None = Query(None),
    district_name: str | None = Query(None),
    crop: str | None = Query(None),
    season: str | None = Query(None),
    soil_type: str | None = Query(None),
    year: str | None = Query(None),
):
    filters = {
        "zone": zone,
        "district_name": district_name,
        "crop": crop,
        "season": season,
        "soil_type": soil_type,
        "year": year,
    }
    has_filters = any(v for v in filters.values() if v)
    try:
        if has_filters:
            rows = bq.get_table_data_filtered(
                dataset_id, table_id, filters, limit, offset, order_by, order_dir
            )
        else:
            rows = bq.get_table_data(
                dataset_id, table_id, limit, offset, order_by, order_dir
            )
        return {"rows": rows, "limit": limit, "offset": offset}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/{dataset_id}/tables/{table_id}/filter-options")
def filter_options(
    dataset_id: str,
    table_id: str,
    fields: str = Query(..., description="Comma-separated list of field names to fetch options for"),
    zone: str | None = Query(None),
    district_name: str | None = Query(None),
    crop: str | None = Query(None),
    season: str | None = Query(None),
    soil_type: str | None = Query(None),
    year: str | None = Query(None),
):
    """Return distinct non-empty values for the requested fields, narrowed by any
    parent filter selections already made (e.g. zone constrains district_name)."""
    requested_fields = [f.strip() for f in fields.split(",") if f.strip()]
    parent_filters = {
        "zone": zone,
        "district_name": district_name,
        "crop": crop,
        "season": season,
        "soil_type": soil_type,
        "year": year,
    }
    try:
        options = bq.get_filter_options(dataset_id, table_id, requested_fields, parent_filters)
        return {"options": options}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import json

@app.get("/api/datasets/{dataset_id}/tables/{table_id}/summary")
def table_summary(dataset_id: str, table_id: str, filters: str | None = None):
    try:
        parsed_filters = json.loads(filters) if filters else None
        return {"columns": bq.get_column_summary(dataset_id, table_id, parsed_filters)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/{dataset_id}/tables/{table_id}/count")
def table_count(dataset_id: str, table_id: str, filters: str | None = None):
    try:
        parsed_filters = json.loads(filters) if filters else None
        return {"count": bq.get_filtered_count(dataset_id, table_id, parsed_filters)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/{dataset_id}/tables/{table_id}/dashboard-charts")
def dashboard_charts(dataset_id: str, table_id: str, filters: str | None = None):
    try:
        parsed_filters = json.loads(filters) if filters else None
        return bq.get_dashboard_charts(dataset_id, table_id, parsed_filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
def run_query(body: QueryBody):
    try:
        rows = bq.run_readonly_query(body.sql, body.max_rows)
        return {"rows": rows}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/insights")
def insights(body: InsightsBody):
    try:
        schema_info = bq.get_schema(body.dataset, body.table)
        summary = bq.get_column_summary(body.dataset, body.table)
        text = get_insights(body.dataset, body.table, schema_info, summary, body.filters)
        return {"insight": text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
def chat_endpoint(body: ChatBody):
    try:
        if not body.messages:
            raise ValueError("Chat messages are required.")

        context = None
        if body.dataset and body.table:
            schema_info = bq.get_schema(body.dataset, body.table)
            context = {
                "dataset": body.dataset,
                "table": body.table,
                "columns": [f["name"] for f in schema_info["fields"]],
            }
        history = [m.dict() for m in body.messages]
        reply = grok_chat(history, context)
        return {"reply": reply}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

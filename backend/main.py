import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import bq_client as bq

app = FastAPI(title="BigQuery Dashboard API")

# ---------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------
# Gather origins from environment variables if present
raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins = [
    origin.strip() for origin in raw_origins.split(",") if origin.strip()
]

# Essential defaults for Vercel and local development
default_origins = [
    "https://agri-pluse.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

for origin in default_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Ensures GET, POST, OPTIONS, etc. are allowed
    allow_headers=["*"],  # Allows standard and custom headers from frontend fetch
)


# ---------------------------------------------------------
# Models & Routes
# ---------------------------------------------------------
class QueryBody(BaseModel):
    sql: str
    max_rows: int = 1000


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
):
    try:
        rows = bq.get_table_data(
            dataset_id, table_id, limit, offset, order_by, order_dir
        )
        return {"rows": rows, "limit": limit, "offset": offset}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets/{dataset_id}/tables/{table_id}/summary")
def table_summary(dataset_id: str, table_id: str):
    try:
        return {"columns": bq.get_column_summary(dataset_id, table_id)}
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
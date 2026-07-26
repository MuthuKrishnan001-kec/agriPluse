"""
Thin wrapper around google-cloud-bigquery that the FastAPI app uses.
Centralizes: client creation, read-only query enforcement, and a couple
of helpers used to auto-generate chart-friendly summaries for any table.
"""
import os
import re
from google.cloud import bigquery

PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
MAX_ROWS = int(os.environ.get("MAX_ROWS", "5000"))

_client = None


def get_client() -> bigquery.Client:
    global _client
    if _client is None:
        _client = bigquery.Client(project=PROJECT_ID)
    return _client


def _assert_select_only(sql: str) -> None:
    """Very small guard so the /query endpoint can't be used to mutate data.
    This is a convenience check, not a security boundary — the real
    boundary is the IAM role on the service account (grant it BigQuery
    Data Viewer + Job User only, never Data Editor)."""
    stripped = sql.strip().strip(";").strip()
    if not re.match(r"^(select|with)\b", stripped, re.IGNORECASE):
        raise ValueError("Only SELECT / WITH queries are allowed through this endpoint.")
    forbidden = r"\b(insert|update|delete|merge|drop|truncate|alter|create)\b"
    if re.search(forbidden, stripped, re.IGNORECASE):
        raise ValueError("Query contains a disallowed keyword.")


def list_datasets():
    client = get_client()
    return [d.dataset_id for d in client.list_datasets()]


def list_tables(dataset_id: str):
    client = get_client()
    ref = client.dataset(dataset_id)
    return [t.table_id for t in client.list_tables(ref)]


def get_schema(dataset_id: str, table_id: str):
    client = get_client()
    table = client.get_table(f"{client.project}.{dataset_id}.{table_id}")
    return {
        "num_rows": table.num_rows,
        "num_bytes": table.num_bytes,
        "fields": [
            {"name": f.name, "type": f.field_type, "mode": f.mode}
            for f in table.schema
        ],
    }


def get_table_data(dataset_id: str, table_id: str, limit: int = 100, offset: int = 0,
                    order_by: str | None = None, order_dir: str = "ASC"):
    client = get_client()
    limit = min(limit, MAX_ROWS)
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    order_clause = ""
    if order_by:
        # order_by must be a real column name — validate against schema first
        schema = get_schema(dataset_id, table_id)
        valid_cols = {f["name"] for f in schema["fields"]}
        if order_by not in valid_cols:
            raise ValueError(f"Unknown column: {order_by}")
        direction = "DESC" if order_dir.upper() == "DESC" else "ASC"
        order_clause = f"ORDER BY `{order_by}` {direction}"
    sql = f"SELECT * FROM {full_table} {order_clause} LIMIT {limit} OFFSET {offset}"
    rows = client.query(sql).result()
    return [dict(row) for row in rows]


def get_column_summary(dataset_id: str, table_id: str, sample_rows: int = 50000):
    """Builds chart-ready summaries for every column:
    - numeric columns: min/max/avg + a 10-bucket histogram
    - string/bool columns: top 10 value counts
    - date/timestamp columns: row count trend bucketed by day/month
    Runs a handful of aggregate queries server-side so the frontend never
    has to pull raw rows to draw charts.
    """
    client = get_client()
    schema = get_schema(dataset_id, table_id)
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    summaries = []

    for field in schema["fields"]:
        name, ftype = field["name"], field["type"]
        col = f"`{name}`"
        try:
            if ftype in ("INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"):
                sql = f"""
                    SELECT MIN({col}) AS min_v, MAX({col}) AS max_v,
                           AVG({col}) AS avg_v, COUNT({col}) AS non_null
                    FROM {full_table}
                """
                stats = list(client.query(sql).result())[0]
                histogram = []
                if stats.min_v is not None and stats.max_v is not None and stats.min_v != stats.max_v:
                    bucket_sql = f"""
                        SELECT CAST(FLOOR(({col} - {stats.min_v}) /
                              (({stats.max_v} - {stats.min_v}) / 10.0)) AS INT64) AS bucket,
                              COUNT(*) AS count
                        FROM {full_table}
                        WHERE {col} IS NOT NULL
                        GROUP BY bucket ORDER BY bucket
                    """
                    histogram = [{"bucket": r.bucket, "count": r.count}
                                 for r in client.query(bucket_sql).result()]
                summaries.append({
                    "name": name, "type": "numeric",
                    "min": stats.min_v, "max": stats.max_v, "avg": stats.avg_v,
                    "non_null": stats.non_null, "histogram": histogram,
                })
            elif ftype in ("STRING", "BOOL", "BOOLEAN"):
                sql = f"""
                    SELECT {col} AS value, COUNT(*) AS count
                    FROM {full_table}
                    WHERE {col} IS NOT NULL
                    GROUP BY value ORDER BY count DESC LIMIT 10
                """
                top_values = [{"value": str(r.value), "count": r.count}
                              for r in client.query(sql).result()]
                summaries.append({"name": name, "type": "categorical", "top_values": top_values})
            elif ftype in ("DATE", "DATETIME", "TIMESTAMP"):
                sql = f"""
                    SELECT DATE_TRUNC(DATE({col}), MONTH) AS period, COUNT(*) AS count
                    FROM {full_table}
                    WHERE {col} IS NOT NULL
                    GROUP BY period ORDER BY period
                """
                trend = [{"period": str(r.period), "count": r.count}
                         for r in client.query(sql).result()]
                summaries.append({"name": name, "type": "temporal", "trend": trend})
            else:
                summaries.append({"name": name, "type": "other"})
        except Exception as e:
            summaries.append({"name": name, "type": ftype, "error": str(e)})

    return summaries


def run_readonly_query(sql: str, max_rows: int = 1000):
    _assert_select_only(sql)
    client = get_client()
    job = client.query(sql)
    rows = list(job.result(max_results=min(max_rows, MAX_ROWS)))
    return [dict(row) for row in rows]

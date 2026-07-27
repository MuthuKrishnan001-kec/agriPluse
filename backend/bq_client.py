import os
import re
import json
from google.cloud import bigquery
from google.oauth2 import service_account
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
MAX_ROWS = int(os.environ.get("MAX_ROWS", "5000"))

_client = None


def get_client() -> bigquery.Client:
    global _client
    if _client is None:
        creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        if creds_json:
            info = json.loads(creds_json)
            credentials = service_account.Credentials.from_service_account_info(info)
            _client = bigquery.Client(project=PROJECT_ID, credentials=credentials)
        else:
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
                    order_by: str | None = None, order_dir: str = "ASC",
                    filters: dict | None = None):
    client = get_client()
    limit = min(limit, MAX_ROWS)
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    schema = get_schema(dataset_id, table_id)
    valid_cols = {f["name"] for f in schema["fields"]}

    where_clause = ""
    query_params = []
    if filters:
        conditions = []
        for col, val in filters.items():
            if col not in valid_cols:
                raise ValueError(f"Unknown column: {col}")
            if val in (None, ""):
                continue
            param_name = f"filter_{col}"
            conditions.append(f"`{col}` = @{param_name}")
            query_params.append(bigquery.ScalarQueryParameter(param_name, "STRING", str(val)))
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

    order_clause = ""
    if order_by:
        if order_by not in valid_cols:
            raise ValueError(f"Unknown column: {order_by}")
        direction = "DESC" if order_dir.upper() == "DESC" else "ASC"
        order_clause = f"ORDER BY `{order_by}` {direction}"

    sql = f"SELECT * FROM {full_table} {where_clause} {order_clause} LIMIT {limit} OFFSET {offset}"
    job_config = bigquery.QueryJobConfig(query_parameters=query_params) if query_params else None
    rows = client.query(sql, job_config=job_config).result()
    return [dict(row) for row in rows]


def get_distinct_values(dataset_id: str, table_id: str, column: str, limit: int = 200):
    client = get_client()
    schema = get_schema(dataset_id, table_id)
    valid_cols = {f["name"] for f in schema["fields"]}
    if column not in valid_cols:
        raise ValueError(f"Unknown column: {column}")
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    sql = f"""
        SELECT DISTINCT `{column}` AS value
        FROM {full_table}
        WHERE `{column}` IS NOT NULL
        ORDER BY value
        LIMIT {limit}
    """
    return [str(r.value) for r in client.query(sql).result()]


# Known filter fields and their column names in BigQuery
FILTER_FIELDS = ["zone", "district_name", "crop", "season", "soil_type", "year"]
def _build_filter_where(filters: dict | None, valid_cols: set):
    """Shared WHERE-clause builder used by filtered data, count, and summary queries."""
    if not filters:
        return "", []
    active = {k: v for k, v in filters.items() if v and str(v).strip()}
    where_parts = []
    query_params = []
    for field, value in active.items():
        if field not in valid_cols or not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", field):
            continue
        param_name = f"filter_{field}"
        where_parts.append(f"LOWER(`{field}`) = LOWER(@{param_name})")
        query_params.append(bigquery.ScalarQueryParameter(param_name, "STRING", str(value)))
    where_clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    return where_clause, query_params


def get_table_data_filtered(
    dataset_id: str,
    table_id: str,
    filters: dict,
    limit: int = 100,
    offset: int = 0,
    order_by: str | None = None,
    order_dir: str = "ASC",
):
    """Return rows with an optional WHERE clause built from named BigQuery parameters.

    Each filter uses LOWER(col) = LOWER(@param) for case-insensitive matching
    so the frontend values don't need to match the exact case stored in BigQuery.
    """
    client = get_client()
    limit = min(limit, MAX_ROWS)
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"

    order_clause = ""
    if order_by:
        schema = get_schema(dataset_id, table_id)
        valid_cols = {f["name"] for f in schema["fields"]}
        if order_by not in valid_cols:
            raise ValueError(f"Unknown column: {order_by}")
        direction = "DESC" if order_dir.upper() == "DESC" else "ASC"
        order_clause = f"ORDER BY `{order_by}` {direction}"

    where_clause, query_params = _build_filter_where(filters, valid_cols)
        param_name = f"filter_{field}"
        where_parts.append(f"LOWER(`{field}`) = LOWER(@{param_name})")
        query_params.append(bigquery.ScalarQueryParameter(param_name, "STRING", str(value)))

    where_clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    sql = f"SELECT * FROM {full_table} {where_clause} {order_clause} LIMIT {limit} OFFSET {offset}"

    job_config = bigquery.QueryJobConfig(query_parameters=query_params)
    rows = client.query(sql, job_config=job_config).result()
    return [dict(row) for row in rows]

def get_filtered_count(dataset_id: str, table_id: str, filters: dict | None = None):
    client = get_client()
    schema = get_schema(dataset_id, table_id)
    valid_cols = {f["name"] for f in schema["fields"]}
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    where_clause, query_params = _build_filter_where(filters, valid_cols)
    sql = f"SELECT COUNT(*) AS cnt FROM {full_table} {where_clause}"
    job_config = bigquery.QueryJobConfig(query_parameters=query_params) if query_params else None
    result = list(client.query(sql, job_config=job_config).result())[0]
    return result.cnt

def _fetch_distinct_for_field(client, full_table, field, applicable, max_values):
    where_parts = []
    query_params = []
    for parent_field, parent_value in applicable.items():
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", parent_field):
            continue
        param_name = f"parent_{parent_field}"
        where_parts.append(f"LOWER(`{parent_field}`) = LOWER(@{param_name})")
        query_params.append(bigquery.ScalarQueryParameter(param_name, "STRING", str(parent_value)))

    base_condition = f"`{field}` IS NOT NULL AND TRIM(CAST(`{field}` AS STRING)) != ''"
    where_clause = "WHERE " + " AND ".join(where_parts + [base_condition]) if where_parts else f"WHERE {base_condition}"

    sql = f"""
        SELECT DISTINCT CAST(`{field}` AS STRING) AS value
        FROM {full_table}
        {where_clause}
        ORDER BY value
        LIMIT {max_values}
    """
    job_config = bigquery.QueryJobConfig(query_parameters=query_params)
    try:
        rows = client.query(sql, job_config=job_config).result()
        return field, [row.value for row in rows if row.value]
    except Exception:
        return field, []


def get_filter_options(
    dataset_id: str,
    table_id: str,
    fields: list[str],
    parent_filters: dict,
    max_values: int = 2000,
):
    """Return distinct values for each requested field, filtered by any already-set
    parent selections (e.g. zone filters the district_name options). Runs one
    query per field concurrently instead of sequentially.

    Returns: { field_name: [value, ...] }
    """
    client = get_client()
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"

    safe_fields = [f for f in fields if re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", f)]
    active_parents = {k: v for k, v in parent_filters.items() if v and str(v).strip()}

    result = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = []
        for field in safe_fields:
            applicable = {k: v for k, v in active_parents.items() if k != field}
            futures.append(executor.submit(_fetch_distinct_for_field, client, full_table, field, applicable, max_values))
        for future in as_completed(futures):
            field, values = future.result()
            result[field] = values

    return result

def _summarize_column(client, full_table, field, where_clause, query_params):
    name, ftype = field["name"], field["type"]
    col = f"`{name}`"
    job_config = bigquery.QueryJobConfig(query_parameters=query_params) if query_params else None
    try:
        if "year" in name.lower():
            sql = f"""
                SELECT {col} AS year, COUNT(*) AS count
                FROM {full_table}
                {where_clause}
                {"AND" if where_clause else "WHERE"} {col} IS NOT NULL
                GROUP BY year ORDER BY year
            """
            trend = []
            for r in client.query(sql, job_config=job_config).result():
                if r.year is not None:
                    try:
                        trend.append({"year": int(r.year), "count": r.count})
                    except (ValueError, TypeError):
                        trend.append({"year": str(r.year), "count": r.count})
            return {"name": name, "type": "year", "trend": trend}

        elif ftype in ("INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"):
            sql = f"""
                SELECT MIN({col}) AS min_v, MAX({col}) AS max_v,
                       AVG({col}) AS avg_v, COUNT({col}) AS non_null
                FROM {full_table}
                {where_clause}
            """
            stats = list(client.query(sql, job_config=job_config).result())[0]
            histogram = []
            if stats.min_v is not None and stats.max_v is not None and stats.min_v != stats.max_v:
                null_guard = "AND" if where_clause else "WHERE"
                bucket_sql = f"""
                    SELECT CAST(FLOOR(({col} - {stats.min_v}) /
                          (({stats.max_v} - {stats.min_v}) / 10.0)) AS INT64) AS bucket,
                          COUNT(*) AS count
                    FROM {full_table}
                    {where_clause}
                    {null_guard} {col} IS NOT NULL
                    GROUP BY bucket ORDER BY bucket
                """
                histogram = [{"bucket": r.bucket, "count": r.count}
                             for r in client.query(bucket_sql, job_config=job_config).result()]
            return {
                "name": name, "type": "numeric",
                "min": stats.min_v, "max": stats.max_v, "avg": stats.avg_v,
                "non_null": stats.non_null, "histogram": histogram,
            }

        elif ftype in ("STRING", "BOOL", "BOOLEAN"):
            null_guard = "AND" if where_clause else "WHERE"
            sql = f"""
                SELECT {col} AS value, COUNT(*) AS count
                FROM {full_table}
                {where_clause}
                {null_guard} {col} IS NOT NULL
                GROUP BY value ORDER BY count DESC LIMIT 10
            """
            top_values = [{"value": str(r.value), "count": r.count}
                          for r in client.query(sql, job_config=job_config).result()]
            return {"name": name, "type": "categorical", "top_values": top_values}

        elif ftype in ("DATE", "DATETIME", "TIMESTAMP"):
            null_guard = "AND" if where_clause else "WHERE"
            sql = f"""
                SELECT DATE_TRUNC(DATE({col}), MONTH) AS period, COUNT(*) AS count
                FROM {full_table}
                {where_clause}
                {null_guard} {col} IS NOT NULL
                GROUP BY period ORDER BY period
            """
            trend = [{"period": str(r.period), "count": r.count}
                     for r in client.query(sql, job_config=job_config).result()]
            return {"name": name, "type": "temporal", "trend": trend}

        else:
            return {"name": name, "type": "other"}
    except Exception as e:
        return {"name": name, "type": ftype, "error": str(e)}


def get_column_summary(dataset_id: str, table_id: str, filters: dict | None = None, sample_rows: int = 50000):
    client = get_client()
    schema = get_schema(dataset_id, table_id)
    valid_cols = {f["name"] for f in schema["fields"]}
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    where_clause, query_params = _build_filter_where(filters, valid_cols)
    fields = schema["fields"]

    summaries = [None] * len(fields)
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_idx = {
            executor.submit(_summarize_column, client, full_table, field, where_clause, query_params): idx
            for idx, field in enumerate(fields)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            summaries[idx] = future.result()

    return summaries

def get_column_summary(dataset_id: str, table_id: str, sample_rows: int = 50000):
    """Builds chart-ready summaries for every column:
    - numeric columns: min/max/avg + a 10-bucket histogram
    - string/bool columns: top 10 value counts
    - date/timestamp columns: row count trend bucketed by day/month
    Runs one query set per column concurrently instead of sequentially —
    this is the main speed win for wide tables.
    """
    client = get_client()
    schema = get_schema(dataset_id, table_id)
    full_table = f"`{client.project}.{dataset_id}.{table_id}`"
    fields = schema["fields"]

    summaries = [None] * len(fields)
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_idx = {
            executor.submit(_summarize_column, client, full_table, field): idx
            for idx, field in enumerate(fields)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            summaries[idx] = future.result()

    return summaries


def run_readonly_query(sql: str, max_rows: int = 1000):
    _assert_select_only(sql)
    client = get_client()
    job = client.query(sql)
    rows = list(job.result(max_results=min(max_rows, MAX_ROWS)))
    return [dict(row) for row in rows]
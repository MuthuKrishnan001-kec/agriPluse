# BigQuery Dashboard

An exploratory dashboard for any BigQuery dataset: pick a dataset/table in the
sidebar and it auto-generates KPI cards, charts per column (histograms for
numeric columns, top-value bars for categorical, monthly trend for
date/timestamp columns), a paginated sortable data table, and a query console
for running your own read-only SQL.

```
bigquery-dashboard/
  backend/     FastAPI service that talks to BigQuery
  frontend/    React + Vite + Tailwind + Recharts UI
```

## 0. Security note (read this first)

Earlier you pasted a Google OAuth **client ID and client secret** into chat.
Those are now considered exposed — go rotate/delete that credential in
[Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
before doing anything else. It also isn't the right credential type for this
app anyway: a deployed backend service should authenticate with a **service
account**, not an OAuth client (OAuth client IDs are for signing in as a
human user in a browser flow).

## 1. Create a service account for the backend

1. Console → IAM & Admin → Service Accounts → **Create service account**.
2. Grant it two roles: **BigQuery Data Viewer** and **BigQuery Job User**
   (read-only — deliberately do *not* grant Data Editor/Admin).
3. Open the new service account → Keys → **Add key → Create new key → JSON**.
   This downloads a `.json` key file — keep it out of git.
4. Save it as `backend/service-account.json` (already gitignored — see below).

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
```
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
GCP_PROJECT_ID=your-project-id
ALLOWED_ORIGINS=http://localhost:5173
MAX_ROWS=5000
```

Run it:
```bash
uvicorn main:app --reload --port 8000
```
Check `http://localhost:8000/api/health` → `{"status": "ok"}`.

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_BASE=http://127.0.0.1:8000
npm run dev
```
Open `http://localhost:5173`.

## 4. How it works

- The sidebar lists datasets/tables via `list_dataset_ids` / `list_table_ids`
  equivalents (`GET /api/datasets`, `GET /api/datasets/{id}/tables`).
- Selecting a table hits three endpoints in parallel: `schema` (row/byte
  counts + column types), `summary` (server-side aggregate queries that
  build histograms / top-N / monthly trend per column — this is what powers
  the auto-charts without ever pulling raw rows), and `data` (a paginated
  `SELECT *`).
- The query console at the top lets you run any `SELECT`/`WITH` statement
  directly; the backend rejects anything else (`INSERT`/`UPDATE`/`DELETE`/
  `DROP`/etc.) as a convenience guard — the real safety boundary is the
  service account's read-only IAM role from step 1.

## 5. Deploying

Any host that runs a Python ASGI app + a static frontend works, e.g.:

- **Backend:** Cloud Run, Render, Railway, Fly.io. Set `GOOGLE_APPLICATION_CREDENTIALS`
  via the platform's secret manager (don't ship the JSON key in the container
  image) and set `ALLOWED_ORIGINS` to your deployed frontend's URL.
- **Frontend:** `npm run build` produces `frontend/dist/` — deploy as a
  static site (Vercel, Netlify, Cloud Storage + CDN, etc.) and point
  `VITE_API_BASE` at your deployed backend URL.

## 6. Customizing further

- **Filters:** add query params to `get_table_data` in `bq_client.py` and a
  filter bar component — the backend already validates column names against
  the schema so it's straightforward to extend safely.
- **Different chart types:** `get_column_summary` in `bq_client.py` is the
  single place that decides what data each chart gets; add a branch there
  and a matching case in `ChartGrid.jsx`.
- **Auth for the dashboard itself:** this scaffold has no login — anyone who
  can reach the backend URL can query your data. Put it behind your own
  auth (e.g. a reverse proxy with SSO, or FastAPI middleware) before
  deploying anywhere non-private.

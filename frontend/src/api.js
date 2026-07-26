const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  listDatasets: () => request('/api/datasets'),
  listTables: (dataset) => request(`/api/datasets/${dataset}/tables`),
  getSchema: (dataset, table) => request(`/api/datasets/${dataset}/tables/${table}/schema`),
  getSummary: (dataset, table) => request(`/api/datasets/${dataset}/tables/${table}/summary`),
  getData: (dataset, table, { limit = 50, offset = 0, orderBy, orderDir } = {}) => {
    const params = new URLSearchParams({ limit, offset })
    if (orderBy) { params.set('order_by', orderBy); params.set('order_dir', orderDir || 'ASC') }
    return request(`/api/datasets/${dataset}/tables/${table}/data?${params}`)
  },
  runQuery: (sql, maxRows = 500) =>
    request('/api/query', { method: 'POST', body: JSON.stringify({ sql, max_rows: maxRows }) }),
}

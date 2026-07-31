const configuredBase = (import.meta.env.VITE_API_BASE || '').trim()
// Uvicorn is started on IPv4 in the local setup.  Using the explicit IPv4
// loopback address prevents browsers that resolve `localhost` to ::1 first
// from treating the API as unreachable.
const API_BASE = configuredBase.replace(/\/$/, '') || 'http://127.0.0.1:8000'

function buildFilterQuery(filters = {}) {
  if (!filters || Object.keys(filters).length === 0) return ''
  return `?filters=${encodeURIComponent(JSON.stringify(filters))}`
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  let res
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (error) {
    throw new Error(`Could not reach the data service at ${API_BASE}. Start the backend and confirm VITE_API_BASE is correct.`)
  }
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
  getSummary: (dataset, table, filters) => request(`/api/datasets/${dataset}/tables/${table}/summary${buildFilterQuery(filters)}`),
  getDashboardCharts: (dataset, table, filters) => request(`/api/datasets/${dataset}/tables/${table}/dashboard-charts${buildFilterQuery(filters)}`),
  getCount: (dataset, table, filters) => request(`/api/datasets/${dataset}/tables/${table}/count${buildFilterQuery(filters)}`),

  getData: (dataset, table, { limit = 50, offset = 0, orderBy, orderDir, filters = {} } = {}) => {
    const params = new URLSearchParams({ limit, offset })
    if (orderBy) { params.set('order_by', orderBy); params.set('order_dir', orderDir || 'ASC') }
    // Forward active filter values as query params for backend WHERE clause
    const filterKeys = ['zone', 'district_name', 'crop', 'season', 'soil_type', 'year']
    filterKeys.forEach((key) => {
      if (filters[key]) params.set(key, filters[key])
    })
    return request(`/api/datasets/${dataset}/tables/${table}/data?${params}`)
  },

  /**
   * Fetch distinct non-empty values for each requested field, narrowed by
   * already-selected parent filters.  The backend applies the parent filter
   * context in BigQuery so only valid combinations are returned.
   *
   * @param {string} dataset
   * @param {string} table
   * @param {string[]} fields - field names to fetch options for
   * @param {object} parentFilters - already-chosen filter values (e.g. { zone: 'NORTH' })
   * @returns {Promise<{ options: { [field]: string[] } }>}
   */
  getFilterOptions: (dataset, table, fields, parentFilters = {}) => {
    const params = new URLSearchParams({ fields: fields.join(',') })
    const filterKeys = ['zone', 'district_name', 'crop', 'season', 'soil_type', 'year']
    filterKeys.forEach((key) => {
      if (parentFilters[key]) params.set(key, parentFilters[key])
    })
    return request(`/api/datasets/${dataset}/tables/${table}/filter-options?${params}`)
  },

  runQuery: (sql, maxRows = 500) =>
    request('/api/query', { method: 'POST', body: JSON.stringify({ sql, max_rows: maxRows }) }),
  // New: Get insights (farm advice)
  getInsights: (dataset, table, filters) =>
    request('/api/insights', { method: 'POST', body: JSON.stringify({ dataset, table, filters }) }),
  // New: Send chat messages
  sendChat: (messages, dataset, table) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ messages, dataset, table }) }),
}

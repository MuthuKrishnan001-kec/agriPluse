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


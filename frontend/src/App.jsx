import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import KpiCards from './components/KpiCards'
import ChartGrid from './components/ChartGrid'
import DataTable from './components/DataTable'

const PAGE_SIZE = 25

// The six known cascading filter fields, in hierarchy order.
// Zone is the parent of District; the rest are independent.
const KNOWN_FILTER_FIELDS = [
  { key: 'zone',          label: 'Zone',          priority: 1 },
  { key: 'district_name', label: 'District Name',  priority: 2 },
  { key: 'crop',          label: 'Crop',           priority: 3 },
  { key: 'season',        label: 'Season',         priority: 4 },
  { key: 'soil_type',     label: 'Soil Type',      priority: 5 },
  { key: 'year',          label: 'Year',           priority: 6 },
]

// district_name is the child of zone — when zone changes, district must be re-validated
const CHILD_OF = { district_name: 'zone' }

const NUMERIC_TYPES = new Set(['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'])
const TEMPORAL_TYPES = new Set(['DATE', 'DATETIME', 'TIMESTAMP'])

function humanizeName(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'not recorded'
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return String(value)
}

function formatShortNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return formatValue(value)
  return number.toLocaleString(undefined, { maximumFractionDigits: Math.abs(number) >= 10 ? 0 : 2 })
}

function friendlyError(message) {
  const text = String(message || '').trim()
  if (!text) return 'The live connection did not send back enough detail. Try again in a moment.'
  if (/failed to fetch|networkerror|load failed/i.test(text)) {
    return 'The dashboard could not reach the live data service. Check that the backend is running, then try again.'
  }
  return text
}

function getSummaryType(field, columnSummary) {
  if (columnSummary?.type) return columnSummary.type
  if (NUMERIC_TYPES.has(field?.type)) return 'numeric'
  if (TEMPORAL_TYPES.has(field?.type)) return 'temporal'
  if (['STRING', 'BOOL', 'BOOLEAN'].includes(field?.type)) return 'categorical'
  return 'other'
}

function sortFilterValues(a, b) {
  const left = Number(a)
  const right = Number(b)
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function countBy(values) {
  return values.reduce((counts, value) => {
    const key = formatValue(value)
    counts.set(key, (counts.get(key) || 0) + 1)
    return counts
  }, new Map())
}

function summarizeRowsForCharts(referenceColumns, rows, schema) {
  if (!referenceColumns?.length || !rows) return []
  const schemaByName = new Map((schema?.fields || []).map((field) => [field.name, field]))

  return referenceColumns.map((column) => {
    const field = schemaByName.get(column.name)
    const type = getSummaryType(field, column)
    const values = rows.map((row) => row?.[column.name]).filter((value) => value !== null && value !== undefined && value !== '')

    if (type === 'numeric') {
      const numbers = values.map(Number).filter(Number.isFinite)
      if (numbers.length === 0) return { ...column, histogram: [], non_null: 0 }

      const min = Math.min(...numbers)
      const max = Math.max(...numbers)
      const avg = numbers.reduce((sum, value) => sum + value, 0) / numbers.length
      const bucketCount = min === max ? 1 : 10
      const buckets = Array.from({ length: bucketCount }, (_, index) => ({
        bucket: min === max
          ? formatShortNumber(min)
          : `${formatShortNumber(min + ((max - min) / bucketCount) * index)}-${formatShortNumber(min + ((max - min) / bucketCount) * (index + 1))}`,
        count: 0,
      }))

      numbers.forEach((value) => {
        const index = min === max ? 0 : Math.min(bucketCount - 1, Math.floor(((value - min) / (max - min)) * bucketCount))
        buckets[index].count += 1
      })

      return { ...column, type: 'numeric', min, max, avg, non_null: numbers.length, histogram: buckets }
    }

    if (type === 'categorical') {
      const topValues = Array.from(countBy(values).entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || sortFilterValues(a.value, b.value))
        .slice(0, 10)

      return { ...column, type: 'categorical', top_values: topValues }
    }

    if (type === 'temporal') {
      const periods = values
        .map((value) => {
          const date = new Date(value)
          if (Number.isNaN(date.getTime())) return null
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        })
        .filter(Boolean)

      const trend = Array.from(countBy(periods).entries())
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => a.period.localeCompare(b.period))

      return { ...column, type: 'temporal', trend }
    }

    return column
  })
}

function chooseMetricColumn(columns) {
  const numericColumns = (columns || []).filter((column) => column.type === 'numeric' && column.non_null !== 0)
  return (
    numericColumns.find((column) => /yield|production|harvest|output|area|rain|income|price/i.test(column.name)) ||
    numericColumns[0]
  )
}

function chooseDimension(filterFields) {
  return (
    filterFields.find((field) => /crop/i.test(field.key)) ||
    filterFields.find((field) => /district|zone|region|state/i.test(field.key)) ||
    filterFields.find((field) => /season/i.test(field.key)) ||
    filterFields[0]
  )
}

function getFilterLabel(filterFields, filters) {
  const active = filterFields.filter((field) => filters[field.key])
  if (active.length === 0) return 'All records in the current view are included.'
  return `Filtered by ${active.map((field) => `${field.label}: ${filters[field.key]}`).join(', ')}.`
}

function buildPlainSummary({ columns, filteredRows, schema, filterFields, filters }) {
  const rowCount = filteredRows?.length ?? 0
  const metric = chooseMetricColumn(columns)
  const dimension = chooseDimension(filterFields)
  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const filterCopy = getFilterLabel(filterFields, filters)

  if (!columns?.length && schema) {
    return {
      headline: `This table has ${schema.num_rows?.toLocaleString?.() || 'live'} source records across ${schema.fields?.length || 0} fields.`,
      detail: filterCopy,
    }
  }

  if (activeFilterCount > 0 && rowCount === 0) {
    return {
      headline: 'No loaded records match this exact combination yet.',
      detail: 'Clear one filter or move to another page to keep looking through the live table.',
    }
  }

  if (metric && dimension && rowCount > 0) {
    const groups = new Map()
    filteredRows.forEach((row) => {
      const groupValue = row?.[dimension.key]
      const metricValue = Number(row?.[metric.name])
      if (groupValue === null || groupValue === undefined || groupValue === '' || !Number.isFinite(metricValue)) return
      const key = formatValue(groupValue)
      const current = groups.get(key) || { total: 0, count: 0 }
      current.total += metricValue
      current.count += 1
      groups.set(key, current)
    })

    const topGroup = Array.from(groups.entries())
      .map(([value, item]) => ({ value, average: item.total / item.count, count: item.count }))
      .sort((a, b) => b.average - a.average)[0]

    if (topGroup) {
      return {
        headline: `${humanizeName(metric.name)} is highest for ${topGroup.value}, averaging ${formatShortNumber(topGroup.average)} in the records now shown.`,
        detail: `${filterCopy} This is based on ${rowCount.toLocaleString()} loaded ${rowCount === 1 ? 'record' : 'records'}.`,
      }
    }
  }

  const categorical = (columns || []).find((column) => column.type === 'categorical' && column.top_values?.length)
  if (categorical) {
    const top = categorical.top_values[0]
    return {
      headline: `${formatValue(top.value)} is the most common ${humanizeName(categorical.name).toLowerCase()}, appearing ${formatValue(top.count)} times.`,
      detail: filterCopy,
    }
  }

  if (metric) {
    return {
      headline: `${humanizeName(metric.name)} averages ${formatShortNumber(metric.avg)} with values from ${formatShortNumber(metric.min)} to ${formatShortNumber(metric.max)}.`,
      detail: filterCopy,
    }
  }

  return {
    headline: rowCount > 0
      ? `There are ${rowCount.toLocaleString()} loaded ${rowCount === 1 ? 'record' : 'records'} ready to review.`
      : 'Choose a dataset and table to see the live farm view.',
    detail: filterCopy,
  }
}

// ---------------------------------------------------------------------------
// FilterBar — driven by dynamic options fetched from the backend
// ---------------------------------------------------------------------------
function FilterBar({
  datasets,
  tables,
  selectedDataset,
  selectedTable,
  filters,
  filterFields,
  filterOptions,
  loadingFilterOptions,
  loadingDatasets,
  loadingTables,
  running,
  onSelectDataset,
  onSelectTable,
  onFilterChange,
  onClearFilters,
  onRefresh,
}) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <section className="rounded-lg border border-border/25 bg-linen p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-earth">Farm view filters</h2>
          <p className="mt-1 text-sm leading-6 text-earth/70">
            Pick the live table, then narrow it by zone, district, crop, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-12 rounded-md border border-crop bg-crop px-4 py-2 text-sm font-semibold text-linen transition hover:bg-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Refresh live data
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-earth">
          <span className="font-semibold">Dataset</span>
          <select
            value={selectedDataset || ''}
            onChange={(event) => onSelectDataset(event.target.value || null)}
            className="min-h-12 rounded-md border border-border/35 bg-linen px-3 py-2 text-base text-earth shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            disabled={loadingDatasets}
          >
            <option value="">{loadingDatasets ? 'Loading datasets...' : 'Choose a dataset'}</option>
            {datasets.map((dataset) => (
              <option key={dataset} value={dataset}>{dataset}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-earth">
          <span className="font-semibold">Table</span>
          <select
            value={selectedTable || ''}
            onChange={(event) => onSelectTable(event.target.value || null)}
            className="min-h-12 rounded-md border border-border/35 bg-linen px-3 py-2 text-base text-earth shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedDataset || loadingTables}
          >
            <option value="">
              {!selectedDataset ? 'Choose a dataset first' : loadingTables ? 'Loading tables...' : 'Choose a table'}
            </option>
            {tables.map((table) => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </label>

        {filterFields.map((field) => {
          const options = filterOptions[field.key] || []
          const isLoading = loadingFilterOptions
          return (
            <label key={field.key} className="flex flex-col gap-2 text-sm text-earth">
              <span className="font-semibold flex items-center gap-2">
                {field.label}
                {isLoading && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-crop border-t-transparent" aria-label="Loading options" />
                )}
              </span>
              <select
                value={filters[field.key] || ''}
                onChange={(event) => onFilterChange(field.key, event.target.value)}
                disabled={isLoading || options.length === 0}
                className="min-h-12 rounded-md border border-border/35 bg-linen px-3 py-2 text-base text-earth shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">All {field.label.toLowerCase()}</option>
                {options.sort(sortFilterValues).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          )
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-earth/70">
          {running
            ? 'Pulling the newest records for this table.'
            : selectedTable
              ? activeFilterCount > 0
                ? `${activeFilterCount} ${activeFilterCount === 1 ? 'filter is' : 'filters are'} active.`
                : filterFields.length > 0
                  ? 'Use the field filters to narrow the current farm view.'
                  : 'This table is ready; no filter fields were detected.'
              : 'Choose a dataset and table to begin.'}
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={activeFilterCount === 0}
          className="min-h-11 rounded-md border border-border/35 bg-linen px-4 py-2 text-sm font-semibold text-earth transition hover:bg-wheat/20 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Clear field filters
        </button>
      </div>
    </section>
  )
}

function AppHeader() {
  return (
    <nav className="bg-crop shadow-soft">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <div className="block text-xl font-bold tracking-tight text-linen">Farm Data Benchmark</div>
          <div className="text-xs font-medium uppercase text-linen/80">Live BigQuery agricultural records</div>
        </div>
      </div>
    </nav>
  )
}

function Overview({ selectedDataset, selectedTable }) {
  return (
    <section>
      <h1 className="font-display text-3xl font-semibold leading-tight text-earth">Platform overview</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-earth/70 sm:text-base">
        {selectedDataset && selectedTable
          ? `Reviewing ${selectedDataset}.${selectedTable} with filters, visual summaries, and live rows.`
          : 'Compare crop, season, soil, zone, and yield patterns from live BigQuery records in a field-friendly view.'}
      </p>
    </section>
  )
}

function PlainSummary({ summary }) {
  return (
    <section className="rounded-lg border border-border/25 bg-linen px-4 py-4 shadow-soft sm:px-5">
      <p className="font-display text-2xl leading-snug text-earth">{summary.headline}</p>
      <p className="mt-2 text-sm leading-6 text-earth/70">{summary.detail}</p>
    </section>
  )
}

function StatePanel({ title, body, actionLabel, onAction, tone = 'neutral' }) {
  const toneClass = tone === 'error' ? 'border-accent bg-accent/10' : 'border-border/25 bg-linen'
  return (
    <section className={`rounded-lg border px-4 py-5 shadow-soft ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-earth">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-earth/70">{body}</p>
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-12 rounded-md border border-crop bg-crop px-4 py-2 text-sm font-semibold text-linen transition hover:bg-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [datasets, setDatasets] = useState([])
  const [tables, setTables] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)

  const [schema, setSchema] = useState(null)
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState(null)
  const [page, setPage] = useState(0)
  const [orderBy, setOrderBy] = useState(null)
  const [orderDir, setOrderDir] = useState('ASC')

  const [running, setRunning] = useState(false)
  const [loadingDatasets, setLoadingDatasets] = useState(false)
  const [loadingTables, setLoadingTables] = useState(false)
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false)
  const [error, setError] = useState(null)

  // filters: { zone, district_name, crop, season, soil_type, year }
  const [filters, setFilters] = useState({})
  // filterOptions: { zone: [...], district_name: [...], ... } — fetched from backend
  const [filterOptions, setFilterOptions] = useState({})
  // Which filter fields are actually present in the current table (detected from schema)
  const [filterFields, setFilterFields] = useState([])

  // Debounce ref so rapid filter changes don't spam the API
  const filterOptionsFetchRef = useRef(null)

  // -------------------------------------------------------------------------
  // Detect which KNOWN_FILTER_FIELDS exist in the current table schema
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!schema?.fields?.length) {
      setFilterFields([])
      return
    }
    const schemaKeys = new Set(schema.fields.map((f) => f.name.toLowerCase()))
    const present = KNOWN_FILTER_FIELDS.filter((f) => schemaKeys.has(f.key.toLowerCase()))
    setFilterFields(present)
  }, [schema])

  // -------------------------------------------------------------------------
  // Fetch filter options from backend whenever table or filters change
  // -------------------------------------------------------------------------
  const loadFilterOptions = useCallback(
    async (dataset, table, currentFilters, fields) => {
      if (!dataset || !table || !fields?.length) return

      // Debounce: cancel any pending fetch and wait 120 ms
      if (filterOptionsFetchRef.current) clearTimeout(filterOptionsFetchRef.current)

      filterOptionsFetchRef.current = setTimeout(async () => {
        setLoadingFilterOptions(true)
        try {
          const result = await api.getFilterOptions(dataset, table, fields.map((f) => f.key), currentFilters)
          setFilterOptions(result.options || {})
        } catch {
          // Silently keep existing options on error
        } finally {
          setLoadingFilterOptions(false)
        }
      }, 120)
    },
    []
  )

  // -------------------------------------------------------------------------
  // Data loaders
  // -------------------------------------------------------------------------
  const loadDatasets = useCallback(async () => {
    setLoadingDatasets(true)
    setError(null)
    try {
      const result = await api.listDatasets()
      setDatasets(result.datasets || [])
    } catch (e) {
      setError({ scope: 'datasets', message: friendlyError(e.message) })
    } finally {
      setLoadingDatasets(false)
    }
  }, [])

  const loadTables = useCallback(async (dataset) => {
    if (!dataset) return
    setLoadingTables(true)
    setError(null)
    try {
      const result = await api.listTables(dataset)
      setTables(result.tables || [])
    } catch (e) {
      setError({ scope: 'tables', message: friendlyError(e.message) })
    } finally {
      setLoadingTables(false)
    }
  }, [])

  const loadTable = useCallback(
    async (dataset, table, pageArg = 0, orderByArg = null, orderDirArg = 'ASC', activeFilters = {}) => {
      setRunning(true)
      setError(null)
      try {
        const [schemaRes, summaryRes, dataRes] = await Promise.all([
          api.getSchema(dataset, table),
          api.getSummary(dataset, table),
          api.getData(dataset, table, {
            limit: PAGE_SIZE,
            offset: pageArg * PAGE_SIZE,
            orderBy: orderByArg,
            orderDir: orderDirArg,
            filters: activeFilters,
          }),
        ])
        setSchema(schemaRes)
        setSummary(summaryRes.columns || [])
        setRows(dataRes.rows || [])
      } catch (e) {
        setError({ scope: 'table', message: friendlyError(e.message) })
      } finally {
        setRunning(false)
      }
    },
    []
  )

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadDatasets()
  }, [loadDatasets])

  useEffect(() => {
    if (!selectedDataset) {
      setSelectedTable(null)
      setTables([])
      setSchema(null)
      setSummary(null)
      setRows(null)
      setFilters({})
      setFilterOptions({})
      setFilterFields([])
      return
    }
    setSelectedTable(null)
    setTables([])
    setSchema(null)
    setSummary(null)
    setRows(null)
    setFilters({})
    setFilterOptions({})
    setFilterFields([])
    loadTables(selectedDataset)
  }, [selectedDataset, loadTables])

  useEffect(() => {
    if (selectedDataset && selectedTable) {
      setPage(0)
      setOrderBy(null)
      setOrderDir('ASC')
      setFilters({})
      setFilterOptions({})
      loadTable(selectedDataset, selectedTable, 0, null, 'ASC', {})
    }
  }, [selectedDataset, selectedTable, loadTable])

  // Once filterFields are known for a table, load initial options (no parent filters yet)
  useEffect(() => {
    if (selectedDataset && selectedTable && filterFields.length > 0) {
      loadFilterOptions(selectedDataset, selectedTable, {}, filterFields)
    }
  }, [filterFields, selectedDataset, selectedTable, loadFilterOptions])

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters])

  // Client-side filter of loaded rows (for instant feedback while BQ fetches)
  const filteredRows = useMemo(() => {
    if (!rows) return []
    return rows.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        return String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()
      })
    )
  }, [rows, filters])

  const chartColumns = useMemo(() => {
    if (!summary) return []
    return activeFilterCount > 0 ? summarizeRowsForCharts(summary, filteredRows, schema) : summary
  }, [activeFilterCount, filteredRows, schema, summary])

  const plainSummary = useMemo(() => buildPlainSummary({
    columns: chartColumns,
    filteredRows: activeFilterCount > 0 ? filteredRows : rows || [],
    schema,
    filterFields,
    filters,
  }), [activeFilterCount, chartColumns, filterFields, filteredRows, filters, rows, schema])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => {
      const next = { ...current, [key]: value }

      // Cascading reset: if the changed field is a parent, check children
      KNOWN_FILTER_FIELDS.forEach((field) => {
        const parentKey = CHILD_OF[field.key]
        if (parentKey === key) {
          // The parent changed — reset child if its current value
          // is no longer in the options for the new parent value
          const childOptions = filterOptions[field.key] || []
          const childCurrentValue = next[field.key]
          if (childCurrentValue && !childOptions.some(
            (opt) => String(opt).toLowerCase() === String(childCurrentValue).toLowerCase()
          )) {
            next[field.key] = ''
          }
        }
      })

      // Re-fetch filter options to cascade (e.g. new zone → new district options)
      if (selectedDataset && selectedTable && filterFields.length > 0) {
        loadFilterOptions(selectedDataset, selectedTable, next, filterFields)
      }

      // Re-fetch data from BigQuery with updated filters as WHERE params
      if (selectedDataset && selectedTable) {
        setPage(0)
        loadTable(selectedDataset, selectedTable, 0, orderBy, orderDir, next)
      }

      return next
    })
  }, [filterOptions, filterFields, selectedDataset, selectedTable, loadFilterOptions, loadTable, orderBy, orderDir])

  const clearFilters = useCallback(() => {
    setFilters({})
    if (selectedDataset && selectedTable && filterFields.length > 0) {
      loadFilterOptions(selectedDataset, selectedTable, {}, filterFields)
    }
    if (selectedDataset && selectedTable) {
      setPage(0)
      loadTable(selectedDataset, selectedTable, 0, orderBy, orderDir, {})
    }
  }, [selectedDataset, selectedTable, filterFields, loadFilterOptions, loadTable, orderBy, orderDir])

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    loadTable(selectedDataset, selectedTable, nextPage, orderBy, orderDir, filters)
  }

  const handleSort = (column) => {
    const direction = orderBy === column && orderDir === 'ASC' ? 'DESC' : 'ASC'
    setOrderBy(column)
    setOrderDir(direction)
    setPage(0)
    loadTable(selectedDataset, selectedTable, 0, column, direction, filters)
  }

  const retryCurrentView = () => {
    if (error?.scope === 'datasets' || !selectedDataset) { loadDatasets(); return }
    if (error?.scope === 'tables' || !selectedTable) { loadTables(selectedDataset); return }
    loadTable(selectedDataset, selectedTable, page, orderBy, orderDir, filters)
  }

  const refreshCurrentView = () => {
    if (selectedDataset && selectedTable) {
      loadTable(selectedDataset, selectedTable, page, orderBy, orderDir, filters)
    } else if (selectedDataset) {
      loadTables(selectedDataset)
    } else {
      loadDatasets()
    }
  }

  const hasDataView = Boolean(rows)
  const hasRows = filteredRows.length > 0
  const canUseTableControls = Boolean(selectedDataset && selectedTable)

  return (
    <div className="flex min-h-screen flex-col bg-linen font-sans text-earth">
      <AppHeader />

      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
        <Overview selectedDataset={selectedDataset} selectedTable={selectedTable} />

        {error && (
          <div className="mt-6">
            <StatePanel
              title="The live farm data did not refresh"
              body={error.message}
              actionLabel="Try again"
              onAction={retryCurrentView}
              tone="error"
            />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <FilterBar
              datasets={datasets}
              tables={tables}
              selectedDataset={selectedDataset}
              selectedTable={selectedTable}
              filters={filters}
              filterFields={filterFields}
              filterOptions={filterOptions}
              loadingFilterOptions={loadingFilterOptions}
              loadingDatasets={loadingDatasets}
              loadingTables={loadingTables}
              running={running}
              onSelectDataset={setSelectedDataset}
              onSelectTable={setSelectedTable}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              onRefresh={refreshCurrentView}
            />

            {running && !rows && (
              <StatePanel
                title="Opening the latest field records"
                body="The dashboard is pulling the schema, summary, and first page of rows from BigQuery."
                actionLabel="Refresh"
                onAction={refreshCurrentView}
              />
            )}

            {!selectedDataset && !running && !rows && (
              <StatePanel
                title="Start with a dataset"
                body="Choose a dataset in the filter card to see tables, farm highlights, charts, and rows."
                actionLabel="Refresh datasets"
                onAction={loadDatasets}
              />
            )}

            {selectedDataset && !selectedTable && !running && !rows && (
              <StatePanel
                title="Now choose a table"
                body={tables.length > 0
                  ? 'Pick one table from this dataset to build the farmer view.'
                  : 'No tables are showing for this dataset yet. Refresh the list and check the live connection.'}
                actionLabel="Refresh tables"
                onAction={() => loadTables(selectedDataset)}
              />
            )}

            {hasDataView && (
              <>
                <PlainSummary summary={plainSummary} />

                {summary && <ChartGrid columns={chartColumns} activeFilters={activeFilterCount} />}

                {!hasRows && (
                  <StatePanel
                    title={activeFilterCount > 0 ? 'No loaded records match those filters' : 'This table page is empty'}
                    body={activeFilterCount > 0
                      ? 'Clear a filter or move through the table pages to keep checking the live records.'
                      : 'The live table returned no rows for this page. Refresh the view to check again.'}
                    actionLabel={activeFilterCount > 0 ? 'Clear filters' : 'Refresh table'}
                    onAction={activeFilterCount > 0 ? clearFilters : refreshCurrentView}
                  />
                )}

                <DataTable
                  rows={filteredRows}
                  columns={rows?.[0] ? Object.keys(rows[0]) : undefined}
                  page={page}
                  pageSize={PAGE_SIZE}
                  sourceRowCount={rows.length}
                  matchingRowCount={filteredRows.length}
                  activeFilters={activeFilterCount}
                  onPageChange={canUseTableControls ? handlePageChange : undefined}
                  orderBy={orderBy}
                  orderDir={orderDir}
                  onSort={canUseTableControls ? handleSort : undefined}
                  onRetry={refreshCurrentView}
                  onClearFilters={clearFilters}
                />
              </>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-6">
              {schema && (
                <KpiCards
                  schema={schema}
                  loadedRows={rows.length}
                  matchingRows={filteredRows.length}
                  activeFilters={activeFilterCount}
                />
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

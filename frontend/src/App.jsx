// src/App.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import KpiCards from './components/KpiCards'
import ChartGrid from './components/ChartGrid'
import DataTable from './components/DataTable'
import AppLayout from './components/AppLayout'
import InsightBar from './components/InsightBar'
import AdviceModal from './components/AdviceModal'
import ChatWidget from './components/ChatWidget'
import TableCardsToggle from './components/TableCardsToggle'
import FilterBar from './components/FilterBar'
import PlainSummary from './components/PlainSummary'
// Placeholder view components (to be expanded later)
import CropAnalyticsView from './components/views/CropAnalyticsView'
import RegionalInsightsView from './components/views/RegionalInsightsView'
import SoilHealthView from './components/views/SoilHealthView'
import ClimateTrendsView from './components/views/ClimateTrendsView'
import FarmAdviceView from './components/views/FarmAdviceView'

const PAGE_SIZE = 25

const KNOWN_FILTER_FIELDS = [
  { key: 'zone',          label: 'Zone',         priority: 1 },
  { key: 'district_name', label: 'District Name', priority: 2 },
  { key: 'crop',          label: 'Crop',          priority: 3 },
  { key: 'season',        label: 'Season',        priority: 4 },
  { key: 'soil_type',     label: 'Soil Type',     priority: 5 },
  { key: 'year',          label: 'Year',          priority: 6 },
]

const CHILD_OF = { district_name: 'zone' }

const NUMERIC_TYPES = new Set(['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'])
const TEMPORAL_TYPES = new Set(['DATE', 'DATETIME', 'TIMESTAMP'])

function humanizeName(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, c => c.toUpperCase())
}

function formatValue(value) { if (value === null || value === undefined || value === '') return 'not recorded'; if (typeof value === 'number') { return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 }) } return String(value) }
function formatShortNumber(value) { const n = Number(value); if (!Number.isFinite(n)) return formatValue(value); if (Math.abs(n) >= 1000) { return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(n) } return n.toLocaleString(undefined, { maximumFractionDigits: Math.abs(n) >= 10 ? 0 : 2 }) }
function friendlyError(msg) { const t = String(msg || '').trim(); if (!t) return 'The live connection did not send back enough detail. Try again in a moment.'; if (/failed to fetch|networkerror|load failed/i.test(t)) return 'The dashboard could not reach the live data service. Check that the backend is running, then try again.'; return t }
function getSummaryType(field, columnSummary) { if (columnSummary?.type) return columnSummary.type; if (NUMERIC_TYPES.has(field?.type)) return 'numeric'; if (TEMPORAL_TYPES.has(field?.type)) return 'temporal'; if (['STRING', 'BOOL', 'BOOLEAN'].includes(field?.type)) return 'categorical'; return 'other' }
function sortFilterValues(a, b) { const l = Number(a), r = Number(b); if (Number.isFinite(l) && Number.isFinite(r)) return l - r; return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) }
function countBy(values) { return values.reduce((acc, v) => { const k = formatValue(v); acc.set(k, (acc.get(k) || 0) + 1); return acc }, new Map()) }
function bucketValues(values, bucketCount = 10) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const step = range / bucketCount;
  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const lo = min + i * step;
    const hi = i === bucketCount - 1 ? max : lo + step;
    buckets.push({
      bucket: `${formatShortNumber(lo)}-${formatShortNumber(hi)}`,
      count: 0,
      sumMetric: 0,
    });
  }
  nums.forEach(v => {
    const i = Math.min(bucketCount - 1, Math.floor(((v - min) / range) * bucketCount));
    buckets[i].count++;
  });
  return buckets;
};
function chooseMetric(columns) {
  if (!Array.isArray(columns)) return null;
  const exactNumeric = columns.find(c => c?.type === 'numeric' && Number.isFinite(c?.avg));
  if (exactNumeric) return exactNumeric;
  const anyNumeric = columns.find(c => c?.type === 'numeric');
  if (anyNumeric) return anyNumeric;
  return columns.find(c => c?.type === 'year') || columns.find(c => c?.type === 'temporal') || null;
}

function chooseDim(fields) {
  return (
    fields.find(f => /crop/i.test(f.key)) ||
    fields.find(f => /district|zone|region|state/i.test(f.key)) ||
    fields.find(f => /season/i.test(f.key)) ||
    fields[0]
  );
}
function filterLabel(fields, filters) {
  const active = fields.filter(f => filters[f.key]);
  if (!active.length) return 'All records in the current view are included.';
  return `Filtered by ${active.map(f => `${f.label}: ${filters[f.key]}`).join(', ')}`;
}
function buildPlainSummary({ cols, rows, schema, fields, filters }) {
  const rc = rows?.length ?? 0;
  const metric = chooseMetric(cols);
  const dim = chooseDim(fields);
  const afc = Object.values(filters).filter(Boolean).length;
  const label = filterLabel(fields, filters);
  if (!cols?.length && schema) {
    return {
      headline: `This table has ${schema.num_rows?.toLocaleString?.() || 'live'} source records across ${schema.fields?.length || 0} fields.`,
      detail: label,
    };
  }
  if (afc > 0 && rc === 0) {
    return {
      headline: 'No loaded records match this exact combination yet.',
      detail: 'Clear one filter or move to another page to keep looking.',
    };
  }
  if (metric && dim && rc > 0) {
    const groups = new Map();
    rows.forEach(row => {
      const gv = row?.[dim.key];
      const mv = Number(row?.[metric.name]);
      if (gv == null || gv === '' || !Number.isFinite(mv)) return;
      const k = formatValue(gv);
      const cur = groups.get(k) || { total: 0, count: 0 };
      cur.total += mv;
      cur.count++;
      groups.set(k, cur);
    });
    const top = Array.from(groups.entries())
      .map(([v, i]) => ({ value: v, avg: i.total / i.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (top) {
      return {
        headline: `${humanizeName(metric.name)} is highest for ${top.value}, averaging ${formatShortNumber(top.avg)} in the records now shown.`,
        detail: `${label} Based on ${rc.toLocaleString()} loaded ${rc === 1 ? 'record' : 'records'}.`,
      };
    }
  }
  const cat = (cols || []).find(c => c.type === 'categorical' && c.top_values?.length);
  if (cat) {
    const t = cat.top_values[0];
    return {
      headline: `${formatValue(t.value)} is the most common ${humanizeName(cat.name).toLowerCase()}, appearing ${formatValue(t.count)} times.`,
      detail: label,
    };
  }
  if (metric) {
    return {
      headline: `${humanizeName(metric.name)} averages ${formatShortNumber(metric.avg)} with values from ${formatShortNumber(metric.min)} to ${formatShortNumber(metric.max)}.`,
      detail: label,
    };
  }
  return {
    headline: rc > 0 ? `There are ${rc.toLocaleString()} loaded ${rc === 1 ? 'record' : 'records'} ready to review.` : 'Choose a dataset and table to see the live farm view.',
    detail: label,
  };
}



export default function App() {
  // Core data state
  const [datasets, setDatasets] = useState([])
  const [tables, setTables] = useState([])
  const [selectedDataset, setSelectedDataset] = useState('')
  const [selectedTable, setSelectedTable] = useState('')
  const [schema, setSchema] = useState(null)
  const [summary, setSummary] = useState(null)
  const [dashboardCharts, setDashboardCharts] = useState(null)
  const [rows, setRows] = useState(null)
  const [page, setPage] = useState(0)
  const [orderBy, setOrderBy] = useState(null)
  const [orderDir, setOrderDir] = useState('ASC')
  const [filters, setFilters] = useState({})
  const [filterOptions, setFilterOptions] = useState({})
  const [filterFields, setFilterFields] = useState([])
  const [running, setRunning] = useState(false)
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false)
  const [error, setError] = useState(null)
  const [insight, setInsight] = useState('')
  const [showAdvice, setShowAdvice] = useState(false)
  const [viewAsCards, setViewAsCards] = useState(false)
  const [activeView, setActiveView] = useState('overview')

  const debounceRef = useRef(null)

  // Load list of datasets on mount
  useEffect(() => {
    api.listDatasets().then(res => {
      const dsList = res.datasets || [];
      setDatasets(dsList);
      if (dsList.length > 0 && !selectedDataset) {
        setSelectedDataset(dsList[0]);
      }
    }).catch(() => {/* ignore */})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load tables when a dataset is chosen
  useEffect(() => {
    if (!selectedDataset) return
    api.listTables(selectedDataset).then(res => {
      const tblList = res.tables || [];
      setTables(tblList);
      if (tblList.length > 0) {
        setSelectedTable(tblList[0]);
      }
    }).catch(() => setTables([]))
  }, [selectedDataset])

  // Load schema/summary/rows when dataset+table changes or pagination/sort/filters change
  const loadTable = useCallback(async (ds, tbl, pageArg, obArg, odArg, activeFilters) => {
    setRunning(true); setError(null)
    try {
      const schemaPromise = typeof api.getSchema === 'function'
        ? api.getSchema(ds, tbl)
        : Promise.resolve(null)

      const [sr, smr, dr, cr] = await Promise.all([
        schemaPromise,
        api.getSummary(ds, tbl, activeFilters),
        api.getData(ds, tbl, { limit: PAGE_SIZE, offset: pageArg * PAGE_SIZE, orderBy: obArg, orderDir: odArg, filters: activeFilters }),
        api.getDashboardCharts(ds, tbl, activeFilters)
      ])

      setSchema(sr && typeof sr === 'object' ? sr : null)
      setSummary(smr?.columns || [])
      setRows(dr?.rows || [])
      setDashboardCharts(cr || {})
    } catch (e) { setError({ scope: 'table', message: friendlyError(e?.message) }) }
    finally { setRunning(false) }
  }, [])

  // Trigger initial load when table selected
  useEffect(() => {
    if (selectedDataset && selectedTable) {
      loadTable(selectedDataset, selectedTable, 0, null, 'ASC', {})
    }
  }, [selectedDataset, selectedTable, loadTable])

  // Load filter options when fields known
  const loadFilterOptions = useCallback((ds, tbl, currentFilters, fields) => {
    if (!ds || !tbl || !fields?.length) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoadingFilterOptions(true)
      try {
        const res = await api.getFilterOptions(ds, tbl, fields.map(f => f.key), currentFilters)
        setFilterOptions(res.options || {})
      } catch { /* ignore */ }
      setLoadingFilterOptions(false)
    }, 120)
  }, [])

  // Determine which known filter fields exist for the current schema
  useEffect(() => {
    if (!schema?.fields?.length) { setFilterFields([]); return }
    const schemaKeys = new Set(schema.fields.map(f => f.name.toLowerCase()))
    setFilterFields(KNOWN_FILTER_FIELDS.filter(f => schemaKeys.has(f.key.toLowerCase())))
  }, [schema])

  // Load distinct values for filter dropdowns when fields change
  useEffect(() => {
    if (filterFields.length > 0) loadFilterOptions(selectedDataset, selectedTable, filters, filterFields)
  }, [filterFields, loadFilterOptions, filters, selectedDataset, selectedTable])

  // Client‑side filtered rows for instant UI feedback
  const filteredRows = useMemo(() => {
    if (!rows) return []
    return rows.filter(row => Object.entries(filters).every(([k, v]) => !v || String(row?.[k] ?? '').toLowerCase() === String(v).toLowerCase()))
  }, [rows, filters])

  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters])

  const plainSummary = useMemo(() => buildPlainSummary({ cols: summary, rows: activeFilterCount > 0 ? filteredRows : rows || [], schema, fields: filterFields, filters }), [activeFilterCount, summary, filterFields, filteredRows, filters, rows, schema])

  // Handlers for filter changes, pagination, sorting
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      // Cascade reset of child filters
      KNOWN_FILTER_FIELDS.forEach(f => {
        if (CHILD_OF[f.key] === key) {
          const childOpts = filterOptions[f.key] || []
          const childVal = next[f.key]
          if (value && childVal && !childOpts.some(o => String(o).toLowerCase() === String(childVal).toLowerCase())) {
            next[f.key] = ''
          }
        }
      })
      // Refresh data after state settled
      setTimeout(() => {
        loadFilterOptions(selectedDataset, selectedTable, next, filterFields)
        setPage(0)
        loadTable(selectedDataset, selectedTable, 0, orderBy, orderDir, next)
      }, 0)
      return next
    })
  }, [filterOptions, filterFields, loadFilterOptions, loadTable, orderBy, orderDir, selectedDataset, selectedTable])

  const clearFilters = useCallback(() => {
    setFilters({})
    loadFilterOptions(selectedDataset, selectedTable, {}, filterFields)
    setPage(0)
    loadTable(selectedDataset, selectedTable, 0, orderBy, orderDir, {})
  }, [filterFields, loadFilterOptions, loadTable, orderBy, orderDir, selectedDataset, selectedTable])

  const handlePageChange = next => { setPage(next); loadTable(selectedDataset, selectedTable, next, orderBy, orderDir, filters) }

  const handleSort = col => { const dir = orderBy === col && orderDir === 'ASC' ? 'DESC' : 'ASC'; setOrderBy(col); setOrderDir(dir); setPage(0); loadTable(selectedDataset, selectedTable, 0, col, dir, filters) }

  const refreshCurrentView = () => { loadTable(selectedDataset, selectedTable, page, orderBy, orderDir, filters) }

  // Insight loading (throttled)
  const insightTimeout = useRef(null)
  useEffect(() => {
    if (!selectedDataset || !selectedTable) return
    if (insightTimeout.current) clearTimeout(insightTimeout.current)
    insightTimeout.current = setTimeout(async () => {
      try {
        const res = await api.getInsights(selectedDataset, selectedTable, filters)
        setInsight(res.insight || '')
      } catch { setInsight('') }
    }, 500)
  }, [selectedDataset, selectedTable, filters])

  // Render
  return (
    <AppLayout
      activeView={activeView}
      onNavigate={setActiveView}
    >
      <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-earth">Platform Overview</h1>
              {selectedDataset && selectedTable && (
                <span className="inline-flex items-center rounded-full bg-crop/10 px-2.5 py-0.5 text-xs font-semibold text-crop border border-crop/20">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-crop animate-pulse"></span>
                  Live Data
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {selectedDataset && selectedTable 
                ? `Active Dataset: ${selectedDataset} / ${selectedTable}` 
                : 'Select a dataset and table to begin.'}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-6">
          <div className="border border-accent bg-accent/10 p-4 rounded">
            <h2 className="font-semibold text-accent">The live farm data did not refresh</h2>
            <p>{error.message}</p>
            <button onClick={refreshCurrentView} className="mt-2 bg-accent text-linen px-3 py-1 rounded">Try again</button>
          </div>
        </div>
      )}

      {activeView === 'overview' ? (
        <>
          {selectedDataset && selectedTable && schema && (
            <div className="mb-6">
              <KpiCards schema={schema} loadedRows={rows?.length} matchingRows={filteredRows?.length} activeFilters={activeFilterCount} />
            </div>
          )}

          <FilterBar
            filters={filters}
            filterFields={filterFields}
            filterOptions={filterOptions}
            loadingFilterOptions={loadingFilterOptions}
            running={running}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            onRefresh={refreshCurrentView}
          />

          <InsightBar insight={insight} onGetAdvice={() => setShowAdvice(true)} />

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setActiveView('details')}
              disabled={!selectedDataset || !selectedTable}
              className="rounded-xl bg-crop px-8 py-3.5 text-lg font-bold text-white shadow-md shadow-crop/20 hover:bg-moss hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
            >
              Get Details
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <button
              onClick={() => setActiveView('overview')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
            >
              ← Back to Overview
            </button>
          </div>
          {(() => {
            switch (activeView) {
              case 'details':
                return (
                  <>
                    <FilterBar
                      filters={filters}
                      filterFields={filterFields}
                      filterOptions={filterOptions}
                      loadingFilterOptions={loadingFilterOptions}
                      running={running}
                      onFilterChange={handleFilterChange}
                      onClearFilters={clearFilters}
                      onRefresh={refreshCurrentView}
                    />
                    <PlainSummary summary={plainSummary} />
                    {running && (
                      <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        Loading data…
                      </div>
                    )}
                    {!running && dashboardCharts && (
                      <div className="mt-6">
                        <ChartGrid charts={dashboardCharts} activeFilters={activeFilterCount} />
                      </div>
                    )}
                    {!running && (
                      <div className="mt-6">
                        <DataTable
                          rows={activeFilterCount > 0 ? filteredRows : (rows || [])}
                          columns={schema?.fields || []}
                          page={page}
                          pageSize={PAGE_SIZE}
                          sourceRowCount={schema?.num_rows}
                          matchingRowCount={activeFilterCount > 0 ? filteredRows.length : rows?.length}
                          activeFilters={activeFilterCount}
                          onPageChange={handlePageChange}
                          orderBy={orderBy}
                          orderDir={orderDir}
                          onSort={handleSort}
                          onRetry={refreshCurrentView}
                          onClearFilters={clearFilters}
                        />
                      </div>
                    )}
                  </>
                );
              case 'crop':
                return <CropAnalyticsView />;
              case 'regional':
                return <RegionalInsightsView />;
              case 'soil':
                return <SoilHealthView />;
              case 'climate':
                return <ClimateTrendsView />;
              case 'advice':
                return <FarmAdviceView />;
              default:
                return null;
            }
          })()}
        </>
      )}
      {showAdvice && (<AdviceModal onClose={() => setShowAdvice(false)} dataset={selectedDataset} table={selectedTable} filters={filters} />)}

      <ChatWidget dataset={selectedDataset} table={selectedTable} />
    </AppLayout>
  );
};

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
function summarizeRowsForCharts(refCols, rows, schema, metricKey = 'record_count') { if (!refCols?.length || !rows) return []
  const byName = new Map((schema?.fields || []).map(f => [f.name, f]))
  const numericMetric = chooseMetric(refCols)
  return refCols.map(col => {
    const field = byName.get(col.name)
    const type = col.type === 'year' || col.name.toLowerCase().includes('year') ? 'year' : getSummaryType(field, col)
    const vals = rows.map(r => ({ val: r?.[col.name], metric: Number(r?.[numericMetric?.name] ?? 1) })).filter(d => d.val !== null && d.val !== undefined && d.val !== '')
    if (type === 'year') {
      const sums = new Map()
      vals.forEach(({ val, metric }) => {
        const yr = parseInt(val, 10)
        const key = Number.isFinite(yr) ? yr : String(val)
        sums.set(key, (sums.get(key) || 0) + (Number.isFinite(metric) ? metric : 0))
      })
      const trend = Array.from(sums.entries()).map(([yr, total]) => ({ year: yr, totalMetric: total })).sort((a, b) => {
        if (typeof a.year === 'number' && typeof b.year === 'number') return a.year - b.year
        return String(a.year).localeCompare(String(b.year))
      })
      return { ...col, type: 'year', trend }
    }
    if (type === 'numeric') {
      const dataPoints = vals.filter(d => Number.isFinite(Number(d.val)) && Number.isFinite(d.metric)).map(d => ({ val: Number(d.val), metric: d.metric }))
      if (!dataPoints.length) return { ...col, histogram: [], non_null: 0 }
      const nums = dataPoints.map(d => d.val)
      const min = Math.min(...nums), max = Math.max(...nums)
      const avg = nums.reduce((s, v) => s + v, 0) / nums.length
      const bucketCount = min === max ? 1 : 10
      const buckets = Array.from({ length: bucketCount }, (_, i) => {
        const bucketLabel = min === max ? formatShortNumber(min) : `${formatShortNumber(min + ((max - min) / bucketCount) * i)}-${formatShortNumber(min + ((max - min) / bucketCount) * (i + 1))}`
        return { bucket: bucketLabel, count: 0, sumMetric: 0 }
      })
      dataPoints.forEach(({ val, metric }) => {
        const idx = min === max ? 0 : Math.min(bucketCount - 1, Math.floor(((val - min) / (max - min)) * bucketCount))
        buckets[idx].count++
        buckets[idx].sumMetric += metric
      })
      return { ...col, type: 'numeric', min, max, avg, non_null: nums.length, histogram: buckets }
    }
    if (type === 'categorical') {
      const top = Array.from(vals.reduce((acc, { val, metric }) => {
        const k = formatValue(val)
        acc.set(k, (acc.get(k) || 0) + (Number.isFinite(metric) ? metric : 0))
        return acc
      }, new Map()).entries()).map(([v, c]) => ({ value: v, count: c })).sort((a, b) => b.count - a.count || sortFilterValues(a.value, b.value)).slice(0, 10)
      return { ...col, type: 'categorical', top_values: top }
    }
    if (type === 'temporal') {
      const periods = vals.map(({ val, metric }) => {
        const d = new Date(val)
        return { period: isNaN(d) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, metric }
      }).filter(d => d.period)
      const trend = Array.from(periods.reduce((acc, { period, metric }) => {
        acc.set(period, (acc.get(period) || 0) + (Number.isFinite(metric) ? metric : 0))
        return acc
      }, new Map()).entries()).map(([p, c]) => ({ period: p, count: c })).sort((a, b) => a.period.localeCompare(b.period))
      return { ...col, type: 'temporal', trend }
    }
    return col
  })
}
function chooseMetric(cols) { const num = (cols || []).filter(c => c.type === 'numeric' && c.non_null !== 0); return num.find(c => /yield|production|harvest|output|area|rain|income|price/i.test(c.name)) || num[0] }
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
      const [sr, smr, dr] = await Promise.all([
        api.getSchema(ds, tbl),
        api.getSummary(ds, tbl),
        api.getData(ds, tbl, { limit: PAGE_SIZE, offset: pageArg * PAGE_SIZE, orderBy: obArg, orderDir: odArg, filters: activeFilters })
      ])
      setSchema(sr)
      setSummary(smr.columns || [])
      setRows(dr.rows || [])
    } catch (e) { setError({ scope: 'table', message: friendlyError(e.message) }) }
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

  const chartColumns = useMemo(() => {
    if (!summary) return []
    return activeFilterCount > 0 ? summarizeRowsForCharts(summary, filteredRows, schema) : summary
  }, [activeFilterCount, filteredRows, schema, summary])

  const plainSummary = useMemo(() => buildPlainSummary({ cols: chartColumns, rows: activeFilterCount > 0 ? filteredRows : rows || [], schema, fields: filterFields, filters }), [activeFilterCount, chartColumns, filterFields, filteredRows, filters, rows, schema])

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
              className="inline-flex items-center text-sm font-medium text-earth/80 hover:text-earth transition-colors"
            >
              ← Back to Overview
            </button>
          </div>
          {(() => {
            switch (activeView) {
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

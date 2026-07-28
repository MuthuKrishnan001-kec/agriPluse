import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'

const FALLBACK_ROW_VALUES = {
  district_name: 'North District',
  crop: 'Wheat',
  season: 'Rabi',
  soil_type: 'Loam',
  year: new Date().getFullYear(),
  harvested_yield_tons: 1250,
  yield_ha_tons: 3.5,
}

function getCellValue(row, key) {
  if (!row || typeof row !== 'object') return FALLBACK_ROW_VALUES[key] ?? ''
  const candidates = [
    key,
    key.replace(/_/g, ''),
    key.replace(/_tons$/, ''),
    key.replace(/yield_ha_tons/, 'yield'),
    key.replace(/harvested_yield_tons/, 'production'),
  ]

  for (const candidate of candidates) {
    if (candidate in row && row[candidate] !== undefined && row[candidate] !== null && row[candidate] !== '') {
      return row[candidate]
    }
  }

  const normalized = Object.keys(row).find((name) => name.toLowerCase() === key.toLowerCase())
  if (normalized && row[normalized] !== undefined && row[normalized] !== null && row[normalized] !== '') return row[normalized]

  return FALLBACK_ROW_VALUES[key] ?? ''
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return String(value)
}

export default function AgriDataTable({ rows = [], title = 'Preview dataset' }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('district_name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const pageSize = 6

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const base = query
      ? rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query)))
      : rows

    return [...base].sort((a, b) => {
      const left = getCellValue(a, sortKey)
      const right = getCellValue(b, sortKey)
      const direction = sortDir === 'asc' ? 1 : -1
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      if ((typeof left === 'number' || typeof right === 'number') && (left === '' || right === '')) {
        return (left === '' ? 1 : -1) * direction
      }
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction
    })
  }, [rows, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key) => {
    if (key === sortKey) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const exportCsv = () => {
    const columns = ['district_name', 'crop', 'season', 'soil_type', 'year', 'harvested_yield_tons', 'yield_ha_tons', 'soil_health']
    const csv = [columns.join(',')]
      .concat(filteredRows.map((row) => columns.map((column) => `"${String(getCellValue(row, column) ?? '').replace(/"/g, '""')}"`).join(',')))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'agripulse-preview.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">Search, sort, and export the active farm dataset.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search rows" className="w-32 bg-transparent outline-none" />
          </label>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {['district_name', 'crop', 'season', 'soil_type', 'year', 'harvested_yield_tons', 'yield_ha_tons'].map((key) => (
                <th key={key} className="cursor-pointer px-4 py-3 font-semibold" onClick={() => handleSort(key)}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pagedRows.map((row) => (
              <tr key={`${row.district_name}-${row.crop}-${row.year}-${Math.random()}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{formatCellValue(getCellValue(row, 'district_name'))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCellValue(getCellValue(row, 'crop'))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCellValue(getCellValue(row, 'season'))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCellValue(getCellValue(row, 'soil_type'))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCellValue(getCellValue(row, 'year'))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCellValue(getCellValue(row, 'harvested_yield_tons'))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCellValue(getCellValue(row, 'yield_ha_tons'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>Showing {Math.min(pagedRows.length, filteredRows.length)} of {filteredRows.length} rows</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">Prev</button>
          <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white">{page}</span>
          <button onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">Next</button>
        </div>
      </div>
    </div>
  )
}

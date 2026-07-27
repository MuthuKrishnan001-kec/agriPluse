import { useEffect, useMemo, useState } from 'react'

function formatCell(value) {
  if (value === null || value === undefined || value === '') return 'not recorded'
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

function humanizeName(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

function SortButton({ column, orderBy, orderDir, onSort }) {
  const active = orderBy === column
  const label = active ? (orderDir === 'ASC' ? 'A-Z' : 'Z-A') : '<>'

  if (!onSort) return null

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-mono text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active
          ? 'border-wheat bg-wheat text-earth'
          : 'border-border bg-soil text-linen hover:bg-soil2'
      }`}
      aria-label={`Sort by ${humanizeName(column)}`}
      title={`Sort by ${humanizeName(column)}`}
    >
      {label}
    </button>
  )
}

function EmptyRows({ colSpan, activeFilters, onClearFilters, onRetry }) {
  return (
    <tr>
      <td className="px-3 py-6" colSpan={colSpan || 1}>
        <div className="flex flex-col gap-3 text-sm text-linen/75 sm:flex-row sm:items-center sm:justify-between">
          <span>{activeFilters > 0 ? 'No loaded rows match these filters.' : 'No rows are showing for this page.'}</span>
          <button
            type="button"
            onClick={activeFilters > 0 ? onClearFilters : onRetry}
            className="min-h-11 rounded-md border border-border bg-earth px-4 py-2 font-semibold text-linen transition hover:bg-soil2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {activeFilters > 0 ? 'Clear filters' : 'Refresh table'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function DataTable({
  rows,
  columns,
  page,
  pageSize,
  sourceRowCount,
  matchingRowCount,
  activeFilters = 0,
  onPageChange,
  orderBy,
  orderDir,
  onSort,
  onRetry,
  onClearFilters,
}) {
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'
  )

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setViewMode((current) => current || 'cards')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Normalise: columns may be schema field objects {name, type} OR plain strings
  const cols = useMemo(() => {
    const raw = columns || (rows?.[0] ? Object.keys(rows[0]) : [])
    return raw.map((c) => (c && typeof c === 'object' ? c.name : c)).filter(Boolean)
  }, [columns, rows])

  if (!rows) return null

  const loadedCount = sourceRowCount ?? rows.length
  const matchCount = matchingRowCount ?? rows.length
  const canGoBack = Boolean(onPageChange) && page > 0
  const canGoForward = Boolean(onPageChange) && loadedCount >= pageSize
  const rowCopy = activeFilters > 0
    ? `${matchCount.toLocaleString()} matching ${matchCount === 1 ? 'row' : 'rows'} on page ${page + 1}`
    : `${loadedCount.toLocaleString()} loaded ${loadedCount === 1 ? 'row' : 'rows'} on page ${page + 1}`

  return (
    <section className="rounded-lg border border-border/25 bg-linen shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-earth">Records</h2>
          <p className="mt-1 text-sm text-earth/70">{rowCopy}</p>
        </div>
        <div className="grid grid-cols-2 rounded-md border border-border/35 bg-linen p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`min-h-11 rounded px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${viewMode === 'table' ? 'bg-wheat text-earth' : 'text-earth hover:bg-wheat/20'}`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`min-h-11 rounded px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${viewMode === 'cards' ? 'bg-crop text-linen' : 'text-earth hover:bg-wheat/20'}`}
          >
            Cards
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="max-h-[640px] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-earth text-xs uppercase text-muted shadow-[0_1px_0_#4F3A2A]">
              <tr>
                {cols.map((column) => (
                  <th key={column} className="min-w-[150px] border-b border-border px-3 py-2">
                    <div className="flex min-h-10 items-center justify-between gap-2">
                      <span className="truncate font-semibold">{humanizeName(column)}</span>
                      <SortButton column={column} orderBy={orderBy} orderDir={orderDir} onSort={onSort} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${page}-${index}`} className={`border-b border-border/70 text-linen/90 ${index % 2 === 0 ? 'bg-soil' : 'bg-soil2'}`}>
                  {cols.map((column) => (
                    <td key={column} className="max-w-[240px] whitespace-nowrap px-3 py-2.5 align-top">
                      <div className="truncate font-mono text-[13px]">{formatCell(row[column])}</div>
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <EmptyRows
                  colSpan={cols.length}
                  activeFilters={activeFilters}
                  onClearFilters={onClearFilters}
                  onRetry={onRetry}
                />
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => (
            <article key={`${page}-${index}`} className="border border-border bg-earth px-4 py-4">
              <div className="flex min-h-8 items-center justify-between gap-3 border-b border-border pb-3">
                <h3 className="font-semibold text-linen">Record {(page * pageSize + index + 1).toLocaleString()}</h3>
                <span className="rounded-md border border-crop/40 bg-soil px-2 py-1 text-xs font-semibold uppercase text-crop">Live</span>
              </div>
              <dl className="divide-y divide-border">
                {cols.map((column) => (
                  <div key={column} className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-3 py-2.5">
                    <dt className="text-xs font-semibold uppercase text-muted">{humanizeName(column)}</dt>
                    <dd className="break-words font-mono text-[13px] text-linen">{formatCell(row[column])}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
          {rows.length === 0 && (
            <div className="border border-border bg-earth px-4 py-5 text-sm text-linen/75 sm:col-span-2 lg:col-span-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{activeFilters > 0 ? 'No loaded rows match these filters.' : 'No rows are showing for this page.'}</span>
                <button
                  type="button"
                  onClick={activeFilters > 0 ? onClearFilters : onRetry}
                  className="min-h-11 rounded-md border border-border bg-soil px-4 py-2 font-semibold text-linen transition hover:bg-soil2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {activeFilters > 0 ? 'Clear filters' : 'Refresh table'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-earth/70">Page {(page + 1).toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(0, page - 1))}
            disabled={!canGoBack}
            className="min-h-12 rounded-md border border-border/35 bg-linen px-4 py-2 text-sm font-semibold text-earth transition hover:bg-wheat/20 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(page + 1)}
            disabled={!canGoForward}
            className="min-h-12 rounded-md border border-border/35 bg-linen px-4 py-2 text-sm font-semibold text-earth transition hover:bg-wheat/20 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}

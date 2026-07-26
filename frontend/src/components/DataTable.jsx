import { useEffect, useMemo, useState } from 'react'

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

export default function DataTable({ rows, columns, page, pageSize, onPageChange, orderBy, orderDir, onSort }) {
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'))

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode((current) => current || 'cards')
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!rows) return null
  const cols = useMemo(() => columns || (rows[0] ? Object.keys(rows[0]) : []), [columns, rows])

  return (
    <section className="rounded-[28px] border border-border/70 bg-soil/80 shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="text-lg font-semibold text-linen">Latest records</div>
          <p className="mt-1 text-sm text-linen/70">Scroll through the table or switch to cards for a touch-friendly view.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-earth/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${viewMode === 'table' ? 'bg-wheat text-earth' : 'text-linen/70'}`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${viewMode === 'cards' ? 'bg-crop text-earth' : 'text-linen/70'}`}
          >
            Cards
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-earth/70 text-[11px] uppercase tracking-[0.24em] text-muted">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="border-b border-border/70 px-3 py-3">
                    {onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(c)}
                        className="flex items-center gap-2 rounded-full px-2 py-1 text-left font-semibold text-linen/80 transition hover:bg-soil/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <span>{c}</span>
                        <span className="text-xs text-wheat">{orderBy === c ? (orderDir === 'ASC' ? '↑' : '↓') : '↕'}</span>
                      </button>
                    ) : (
                      <span className="px-2 py-1">{c}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60 text-linen/85">
                  {cols.map((c) => (
                    <td key={c} className="max-w-[220px] whitespace-nowrap px-3 py-3 text-sm">
                      <div className="truncate font-mono text-[13px]">{formatCell(row[c])}</div>
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-sm text-linen/60" colSpan={cols.length || 1}>No rows returned for this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, i) => (
            <article key={i} className="rounded-[22px] border border-border/70 bg-earth/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-linen">Record {page * pageSize + i + 1}</div>
                <div className="rounded-full border border-crop/30 bg-crop/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-crop">
                  Quick view
                </div>
              </div>
              <div className="space-y-2 text-sm text-linen/80">
                {cols.map((c) => (
                  <div key={c} className="rounded-xl bg-soil/70 p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">{c}</div>
                    <div className="mt-1 break-words font-mono text-[13px] text-linen">{formatCell(row[c])}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="text-sm text-linen/70">Showing page {page + 1}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="min-h-11 rounded-full border border-border/70 bg-earth/70 px-4 py-2 text-sm font-semibold text-linen transition hover:bg-soil/70 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={rows.length < pageSize}
            className="min-h-11 rounded-full border border-border/70 bg-earth/70 px-4 py-2 text-sm font-semibold text-linen transition hover:bg-soil/70 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  )
}

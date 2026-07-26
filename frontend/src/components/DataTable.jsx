export default function DataTable({ rows, columns, page, pageSize, onPageChange, orderBy, orderDir, onSort }) {
  if (!rows) return null
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : [])

  return (
    <div className="border border-border rounded-lg bg-panel overflow-hidden">
      <div className="overflow-x-auto max-h-[420px]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-panel2 z-10">
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  onClick={() => onSort?.(c)}
                  className="px-3 py-2 text-muted uppercase tracking-wider text-[10px] border-b border-border cursor-pointer select-none hover:text-ink whitespace-nowrap"
                >
                  {c} {orderBy === c ? (orderDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-panel2/60">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-ink/90 whitespace-nowrap max-w-[240px] truncate">
                    {String(row[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-4 text-muted" colSpan={cols.length || 1}>No rows returned.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted">
        <span>page {page + 1}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2 py-1 rounded border border-border hover:text-ink disabled:opacity-30"
          >
            ← prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={rows.length < pageSize}
            className="px-2 py-1 rounded border border-border hover:text-ink disabled:opacity-30"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ datasets, tables, selectedDataset, selectedTable, onSelectDataset, onSelectTable }) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-panel2 h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-border">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Source</div>
        <div className="mt-1 font-mono text-sm text-teal">bigquery</div>
      </div>

      <div className="px-3 py-4">
        <div className="px-2 mb-2 text-[11px] uppercase tracking-[0.2em] text-muted">Datasets</div>
        <ul className="space-y-0.5">
          {datasets.map((ds) => (
            <li key={ds}>
              <button
                onClick={() => onSelectDataset(ds)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm font-mono truncate transition-colors ${
                  ds === selectedDataset
                    ? 'bg-amber/10 text-amber'
                    : 'text-ink/80 hover:bg-panel hover:text-ink'
                }`}
              >
                {ds}
              </button>
              {ds === selectedDataset && tables.length > 0 && (
                <ul className="ml-3 mt-0.5 mb-2 border-l border-border pl-2 space-y-0.5">
                  {tables.map((t) => (
                    <li key={t}>
                      <button
                        onClick={() => onSelectTable(t)}
                        className={`w-full text-left px-2 py-1 rounded text-xs font-mono truncate transition-colors ${
                          t === selectedTable
                            ? 'text-teal'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {datasets.length === 0 && (
            <li className="px-2 text-xs text-muted">No datasets found.</li>
          )}
        </ul>
      </div>
    </aside>
  )
}

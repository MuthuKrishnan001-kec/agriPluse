export default function Sidebar({ datasets, tables, selectedDataset, selectedTable, onSelectDataset, onSelectTable }) {
  return (
    <aside className="w-full border-b border-border/70 bg-soil/90 p-4 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r md:p-5 lg:w-80">
      <div className="rounded-[24px] border border-border/70 bg-earth/70 p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-crop/15 text-xl">🌿</div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-crop">agriPulse</div>
            <div className="text-sm text-linen/70">Live farm insight</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border/70 bg-soil/80 p-3 text-sm text-linen/80">
          <div className="font-semibold text-linen">Your records</div>
          <p className="mt-1 leading-6">Choose a set of farm data to view live trends and field details.</p>
        </div>

        <div className="mt-5">
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">Browse</div>
          <ul className="space-y-2">
            {datasets.map((ds) => (
              <li key={ds}>
                <button
                  onClick={() => onSelectDataset(ds)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    ds === selectedDataset
                      ? 'border-crop/40 bg-crop/12 text-linen'
                      : 'border-transparent bg-transparent text-linen/80 hover:border-border hover:bg-soil/70'
                  }`}
                >
                  <span className="truncate font-medium">{ds}</span>
                  <span className="text-xs text-crop">↗</span>
                </button>
                {ds === selectedDataset && tables.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l border-border/70 pl-3">
                    {tables.map((t) => (
                      <li key={t}>
                        <button
                          onClick={() => onSelectTable(t)}
                          className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            t === selectedTable
                              ? 'bg-wheat/12 text-wheat'
                              : 'text-linen/70 hover:bg-soil/70 hover:text-linen'
                          }`}
                        >
                          <span className="truncate">{t}</span>
                          <span className="text-[11px]">▸</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {datasets.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border px-3 py-4 text-sm text-linen/60">
                No record sets found yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  )
}

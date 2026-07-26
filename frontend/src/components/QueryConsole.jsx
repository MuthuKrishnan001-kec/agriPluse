import { useState } from 'react'

export default function QueryConsole({ lastSql, onRun, running }) {
  const [sql, setSql] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <section className="rounded-[28px] border border-border/70 bg-soil/90 p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-linen">Advanced checks</div>
          <p className="mt-1 text-sm text-linen/70">Use this only when you want a custom SQL lookup. The first view stays simple and friendly.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="min-h-11 rounded-full border border-border/70 bg-earth/70 px-4 py-2 text-sm font-semibold text-linen transition hover:bg-soil/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {advancedOpen ? 'Hide advanced mode' : 'Open advanced mode'}
        </button>
      </div>

      {!advancedOpen ? (
        <div className="mt-4 rounded-[22px] border border-border/70 bg-earth/70 p-4 text-sm text-linen/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-linen">
            <span className={`h-2.5 w-2.5 rounded-full ${running ? 'animate-pulse bg-wheat' : 'bg-crop'}`} />
            {running ? 'Refreshing your latest view' : 'No SQL needed for everyday checks'}
          </div>
          <p className="mt-2 leading-6">
            {lastSql ? `The last check used: ${lastSql}` : 'The dashboard already shows the essentials for everyday field review.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-[24px] border border-border/70 bg-earth/70 p-4">
          <div className="flex items-center justify-between text-sm text-linen/70">
            <span className="font-semibold text-linen">Custom query</span>
            <span className="rounded-full bg-wheat/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-wheat">
              {running ? 'Running' : 'Ready'}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (sql.trim()) onRun(sql.trim())
            }}
            className="mt-3"
          >
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              rows={5}
              placeholder="SELECT * FROM `dataset.table` LIMIT 100"
              className="min-h-32 w-full rounded-2xl border border-border/70 bg-soil/80 px-3 py-3 font-mono text-sm text-linen placeholder:text-linen/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-linen/70">Use this if you need a deeper, custom lookup.</p>
              <button
                type="submit"
                className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-linen transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Run query
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

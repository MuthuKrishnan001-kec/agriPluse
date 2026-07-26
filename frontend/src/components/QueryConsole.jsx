import { useState } from 'react'

export default function QueryConsole({ lastSql, onRun, running }) {
  const [sql, setSql] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const canRun = sql.trim().length > 0 && !running

  return (
    <section className="rounded-lg border border-border/25 bg-linen px-4 py-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-earth">Advanced</h2>
          <p className="mt-1 text-sm leading-6 text-earth/70">Custom SQL is available when a deeper check is needed.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="min-h-12 rounded-md border border-border/35 bg-linen px-4 py-2 text-sm font-semibold text-earth transition hover:bg-wheat/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-expanded={advancedOpen}
        >
          {advancedOpen ? 'Close advanced' : 'Open advanced'}
        </button>
      </div>

      {advancedOpen && (
        <div className="mt-4 border-t border-border/20 pt-4">
          {lastSql && (
            <div className="mb-3 rounded-md border border-border bg-earth px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-linen">Last table query</p>
                  <p className="mt-1 break-words font-mono text-xs leading-5 text-linen/70">{lastSql}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSql(lastSql)}
                  className="min-h-10 rounded-md border border-border bg-soil px-3 py-2 text-sm font-semibold text-linen transition hover:bg-soil2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Use this
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (canRun) onRun(sql.trim())
            }}
          >
            <label className="block text-sm font-semibold text-earth" htmlFor="custom-sql">Custom SQL</label>
            <textarea
              id="custom-sql"
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              rows={6}
              placeholder="SELECT * FROM `dataset.table` LIMIT 100"
              className="mt-2 min-h-40 w-full rounded-md border border-border bg-earth px-3 py-3 font-mono text-sm leading-6 text-linen placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-earth/70">{running ? 'Running the custom check.' : 'Read-only SELECT and WITH queries are supported.'}</p>
              <button
                type="submit"
                disabled={!canRun}
                className="min-h-12 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-linen transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

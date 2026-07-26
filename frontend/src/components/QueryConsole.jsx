import { useState } from 'react'

export default function QueryConsole({ lastSql, onRun, running }) {
  const [sql, setSql] = useState('')

  return (
    <div className="border border-border rounded-lg bg-[#080D17] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-amber animate-pulse' : 'bg-teal'}`} />
          Query console
        </div>
        <div className="text-[11px] font-mono text-muted">{running ? 'running…' : 'idle'}</div>
      </div>

      <div className="px-4 py-3 font-mono text-xs text-teal/90 leading-relaxed border-b border-border/60 min-h-[2.5rem]">
        {lastSql ? (
          <span>
            <span className="text-muted">{'> '}</span>
            {lastSql}
            <span className="blink text-amber">▍</span>
          </span>
        ) : (
          <span className="text-muted">{'> '}awaiting query<span className="blink text-amber">▍</span></span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (sql.trim()) onRun(sql.trim())
        }}
        className="flex items-stretch"
      >
        <input
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="SELECT * FROM `dataset.table` LIMIT 100"
          className="flex-1 bg-transparent px-4 py-3 font-mono text-sm text-ink placeholder:text-muted/50 focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 m-1.5 rounded-md bg-amber text-base font-semibold text-sm hover:brightness-110 transition"
        >
          Run
        </button>
      </form>
    </div>
  )
}

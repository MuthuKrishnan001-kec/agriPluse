function formatNumber(value) {
  if (value === null || value === undefined || value === '') return 'Not ready'
  return Number(value).toLocaleString()
}

function formatBytes(value) {
  if (!value) return 'Not ready'
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB`
  return `${(value / 1e6).toFixed(1)} MB`
}

function Card({ label, value, helper, tone = 'wheat' }) {
  const toneClass = {
    wheat: 'border-slate-200 bg-slate-100 text-slate-700',
    crop: 'border-crop/30 bg-crop/10 text-crop',
    accent: 'border-accent/30 bg-accent/10 text-accent',
    linen: 'border-border bg-white text-earth',
  }[tone]

  return (
    <article className="rounded-2xl border border-border bg-white px-5 py-5 shadow-sm">
      <div className={`inline-flex min-h-8 items-center rounded-lg border px-3 text-[11px] font-bold uppercase tracking-[0.05em] ${toneClass}`}>
        {label}
      </div>
      <div className="mt-4 font-display text-4xl font-bold leading-none text-earth tracking-tight">{value}</div>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{helper}</p>
    </article>
  )
}

export default function KpiCards({ schema, loadedRows = 0, matchingRows = 0, activeFilters = 0 }) {
  if (!schema) return null

  const numericCount = schema.fields.filter((field) =>
    ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(field.type)
  ).length

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <Card
        label="Source rows"
        value={formatNumber(schema.num_rows)}
        helper="Total rows reported by BigQuery for this table."
        tone="wheat"
      />
      <Card
        label={activeFilters > 0 ? 'Matches shown' : 'Rows loaded'}
        value={formatNumber(activeFilters > 0 ? matchingRows : loadedRows)}
        helper={activeFilters > 0 ? 'Rows matching the active field filters.' : 'Rows loaded into the current page.'}
        tone="crop"
      />
      <Card
        label="Fields"
        value={formatNumber(schema.fields.length)}
        helper={`${numericCount.toLocaleString()} number ${numericCount === 1 ? 'field' : 'fields'} available for charts.`}
        tone="accent"
      />
    </section>
  )
}

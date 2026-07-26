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
    wheat: 'border-wheat/60 bg-wheat/15 text-earth',
    crop: 'border-crop/50 bg-crop/10 text-crop',
    accent: 'border-accent/50 bg-accent/10 text-accent',
    linen: 'border-border/25 bg-linen text-earth',
  }[tone]

  return (
    <article className="rounded-lg border border-border/25 bg-linen px-4 py-4 shadow-soft">
      <div className={`inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-semibold uppercase ${toneClass}`}>
        {label}
      </div>
      <div className="mt-3 font-display text-3xl leading-none text-earth">{value}</div>
      <p className="mt-2 text-sm leading-5 text-earth/70">{helper}</p>
    </article>
  )
}

export default function KpiCards({ schema, loadedRows = 0, matchingRows = 0, activeFilters = 0 }) {
  if (!schema) return null

  const numericCount = schema.fields.filter((field) =>
    ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(field.type)
  ).length

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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

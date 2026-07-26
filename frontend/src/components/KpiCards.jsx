function Card({ label, value, accent }) {
  return (
    <div className="border border-border rounded-lg bg-panel px-5 py-4 flex-1 min-w-[140px]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${accent || 'text-ink'}`}>{value}</div>
    </div>
  )
}

export default function KpiCards({ schema }) {
  if (!schema) return null
  const numericCount = schema.fields.filter(f =>
    ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(f.type)
  ).length

  return (
    <div className="flex flex-wrap gap-3">
      <Card label="Rows" value={schema.num_rows?.toLocaleString() ?? '—'} accent="text-amber" />
      <Card label="Size" value={schema.num_bytes ? `${(schema.num_bytes / 1e6).toFixed(1)} MB` : '—'} accent="text-teal" />
      <Card label="Columns" value={schema.fields.length} />
      <Card label="Numeric fields" value={numericCount} />
    </div>
  )
}

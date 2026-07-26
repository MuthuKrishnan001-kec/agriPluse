function Card({ label, value, accent, icon }) {
  return (
    <div className="min-w-[150px] flex-1 rounded-[24px] border border-border/70 bg-soil/80 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">{label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-earth/70 text-lg">{icon}</div>
      </div>
      <div className={`mt-4 text-2xl font-semibold ${accent || 'text-linen'}`}>{value}</div>
    </div>
  )
}

export default function KpiCards({ schema }) {
  if (!schema) return null
  const numericCount = schema.fields.filter(f =>
    ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(f.type)
  ).length

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Live rows" value={schema.num_rows?.toLocaleString() ?? '—'} accent="text-wheat" icon="📊" />
      <Card label="Data size" value={schema.num_bytes ? `${(schema.num_bytes / 1e6).toFixed(1)} MB` : '—'} accent="text-crop" icon="🧺" />
      <Card label="Fields" value={schema.fields.length} accent="text-accent" icon="🧾" />
      <Card label="Number fields" value={numericCount} accent="text-linen" icon="🔢" />
    </div>
  )
}

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const AXIS_STYLE = { fontSize: 11, fill: '#7C8AA5', fontFamily: 'JetBrains Mono, monospace' }
const TOOLTIP_STYLE = {
  background: '#101A2C', border: '1px solid #22304A', borderRadius: 8,
  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#E8ECF4',
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="border border-border rounded-lg bg-panel px-4 pt-4 pb-2">
      <div className="mb-2">
        <div className="font-mono text-sm text-ink truncate">{title}</div>
        {subtitle && <div className="text-[11px] text-muted">{subtitle}</div>}
      </div>
      <div className="h-48">{children}</div>
    </div>
  )
}

export default function ChartGrid({ columns }) {
  if (!columns || columns.length === 0) return null

  const renderable = columns.filter(c =>
    (c.type === 'numeric' && c.histogram?.length) ||
    (c.type === 'categorical' && c.top_values?.length) ||
    (c.type === 'temporal' && c.trend?.length)
  )

  if (renderable.length === 0) {
    return <div className="text-sm text-muted">No chartable columns detected for this table.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {renderable.map((col) => {
        if (col.type === 'numeric') {
          return (
            <ChartCard key={col.name} title={col.name} subtitle={`avg ${col.avg?.toFixed?.(2) ?? '—'} · range ${col.min}–${col.max}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={col.histogram}>
                  <CartesianGrid stroke="#22304A" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={{ stroke: '#22304A' }} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={{ stroke: '#22304A' }} tickLine={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#22304A55' }} />
                  <Bar dataKey="count" fill="#F5A623" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }
        if (col.type === 'categorical') {
          return (
            <ChartCard key={col.name} title={col.name} subtitle="top values">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={col.top_values} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke="#22304A" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={AXIS_STYLE} axisLine={{ stroke: '#22304A' }} tickLine={false} />
                  <YAxis dataKey="value" type="category" width={90} tick={AXIS_STYLE} axisLine={{ stroke: '#22304A' }} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#22304A55' }} />
                  <Bar dataKey="count" fill="#3FD0C9" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }
        // temporal
        return (
          <ChartCard key={col.name} title={col.name} subtitle="rows per month">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={col.trend}>
                <CartesianGrid stroke="#22304A" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={AXIS_STYLE} axisLine={{ stroke: '#22304A' }} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={{ stroke: '#22304A' }} tickLine={false} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#E8607A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )
      })}
    </div>
  )
}

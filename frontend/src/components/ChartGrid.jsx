import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const AXIS_STYLE = { fontSize: 11, fill: '#F7EFD9', fontFamily: 'Inter, sans-serif' }
const TOOLTIP_STYLE = {
  background: '#1F1813', border: '1px solid #4F3A2A', borderRadius: 12,
  fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#F7EFD9',
}

function humanizeLabel(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildInsight(col) {
  if (col.type === 'numeric') {
    const average = col.avg?.toFixed?.(1) ?? '—'
    return `Most values sit around ${average}, with the range stretching from ${col.min} to ${col.max}.`
  }
  if (col.type === 'categorical') {
    const top = col.top_values?.[0]?.value || 'the main category'
    return `The most common entry is ${top}, which stands out from the rest.`
  }
  if (col.type === 'temporal') {
    const latest = col.trend?.[col.trend.length - 1]?.count ?? '—'
    return `The recent trend points to ${latest} records in the latest period, so the pattern is easy to follow.`
  }
  return 'This field is useful for a quick scan of the current record set.'
}

function ChartCard({ title, insight, children }) {
  return (
    <div className="rounded-[26px] border border-border/70 bg-soil/80 p-4 shadow-soft">
      <div className="mb-3">
        <div className="text-lg font-semibold text-linen">{title}</div>
        <p className="mt-1 text-sm leading-6 text-linen/75">{insight}</p>
      </div>
      <div className="h-52">{children}</div>
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
    return <div className="rounded-[24px] border border-dashed border-border bg-soil/60 px-4 py-5 text-sm text-linen/70">No clear visuals were found for this record set yet.</div>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {renderable.map((col) => {
        const title = humanizeLabel(col.name)
        const insight = buildInsight(col)
        if (col.type === 'numeric') {
          return (
            <ChartCard key={col.name} title={title} insight={insight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={col.histogram}>
                  <CartesianGrid stroke="#4F3A2A" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#4F3A2A55' }} />
                  <Bar dataKey="count" fill="#C79B41" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }
        if (col.type === 'categorical') {
          return (
            <ChartCard key={col.name} title={title} insight={insight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={col.top_values} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke="#4F3A2A" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis dataKey="value" type="category" width={100} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#4F3A2A55' }} />
                  <Bar dataKey="count" fill="#5A7F3D" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }
        return (
          <ChartCard key={col.name} title={title} insight={insight}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={col.trend}>
                <CartesianGrid stroke="#4F3A2A" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#D96C2B" strokeWidth={3} dot={{ r: 3, fill: '#D96C2B' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )
      })}
    </div>
  )
}

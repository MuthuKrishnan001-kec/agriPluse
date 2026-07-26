import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const COLORS = {
  earth: '#16110D',
  soil: '#1F1813',
  soil2: '#2A2017',
  border: '#4F3A2A',
  linen: '#F7EFD9',
  muted: '#8E7A63',
  wheat: '#C79B41',
  crop: '#5A7F3D',
  accent: '#D96C2B',
  moss: '#7B8E4A',
}

const AXIS_STYLE = { fontSize: 11, fill: COLORS.earth, fontFamily: 'Inter, sans-serif' }
const TOOLTIP_STYLE = {
  background: COLORS.soil,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.linen,
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
}

function humanizeName(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value ?? 'not recorded')
  return number.toLocaleString(undefined, { maximumFractionDigits: Math.abs(number) >= 10 ? 0 : 2 })
}

function trimLabel(value, max = 18) {
  const label = String(value ?? 'not recorded')
  return label.length > max ? `${label.slice(0, max - 1)}...` : label
}

function buildCaption(column) {
  if (column.type === 'numeric') {
    if (!column.histogram?.length) return `${humanizeName(column.name)} has too few recorded values for a clear spread.`
    return `Average ${humanizeName(column.name).toLowerCase()} is ${formatNumber(column.avg)}, ranging from ${formatNumber(column.min)} to ${formatNumber(column.max)}.`
  }

  if (column.type === 'categorical') {
    const top = column.top_values?.[0]
    if (!top) return `${humanizeName(column.name)} has no repeated values in this view.`
    return `${top.value} appears most often for ${humanizeName(column.name).toLowerCase()}, with ${formatNumber(top.count)} records.`
  }

  if (column.type === 'temporal') {
    const largest = [...(column.trend || [])].sort((a, b) => b.count - a.count)[0]
    if (!largest) return `${humanizeName(column.name)} has no dated records in this view.`
    return `${largest.period} has the strongest record count, with ${formatNumber(largest.count)} entries.`
  }

  return `${humanizeName(column.name)} is included in the live table.`
}

function ChartCard({ title, caption, detail, children }) {
  return (
    <article className="rounded-lg border border-border/25 bg-linen px-4 py-4 shadow-soft">
      <header className="mb-3">
        <h3 className="text-lg font-semibold text-earth">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-earth/70">{caption}</p>
      </header>
      <div className="h-60">{children}</div>
      <div className="mt-3 min-h-10 border-t border-border/20 pt-3 text-sm leading-5 text-earth" aria-live="polite">
        {detail ? (
          <span>
            <span className="font-semibold text-crop">{detail.label}</span>
            <span className="text-earth/70">: {detail.value}</span>
          </span>
        ) : null}
      </div>
    </article>
  )
}

function NumericChart({ column }) {
  const [detail, setDetail] = useState(null)

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    if (!payload) return
    setDetail({ label: payload.bucket, value: `${formatNumber(payload.count)} records` })
  }

  return (
    <ChartCard title={humanizeName(column.name)} caption={buildCaption(column)} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={column.histogram} onClick={handleClick} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={COLORS.border} strokeOpacity={0.28} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={(value) => trimLabel(value, 12)} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={34} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: `${COLORS.border}66` }} formatter={(value) => [formatNumber(value), 'Records']} />
          <Bar dataKey="count" fill={COLORS.wheat} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function CategoricalChart({ column }) {
  const [detail, setDetail] = useState(null)

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    if (!payload) return
    setDetail({ label: payload.value, value: `${formatNumber(payload.count)} records` })
  }

  return (
    <ChartCard title={humanizeName(column.name)} caption={buildCaption(column)} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={column.top_values} layout="vertical" onClick={handleClick} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.28} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis dataKey="value" type="category" width={112} tick={AXIS_STYLE} tickFormatter={(value) => trimLabel(value)} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: `${COLORS.border}66` }} formatter={(value) => [formatNumber(value), 'Records']} />
          <Bar dataKey="count" fill={COLORS.crop} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TemporalChart({ column }) {
  const [detail, setDetail] = useState(null)

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    if (!payload) return
    setDetail({ label: payload.period, value: `${formatNumber(payload.count)} records` })
  }

  return (
    <ChartCard title={humanizeName(column.name)} caption={buildCaption(column)} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={column.trend} onClick={handleClick} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.28} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(value) => trimLabel(value, 12)} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={34} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatNumber(value), 'Records']} />
          <Line type="monotone" dataKey="count" stroke={COLORS.accent} strokeWidth={3} dot={{ r: 4, fill: COLORS.accent }} activeDot={{ r: 7, fill: COLORS.wheat, stroke: COLORS.earth, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export default function ChartGrid({ columns, activeFilters = 0 }) {
  if (!columns || columns.length === 0) return null

  const renderable = columns.filter((column) =>
    (column.type === 'numeric' && column.histogram?.length) ||
    (column.type === 'categorical' && column.top_values?.length) ||
    (column.type === 'temporal' && column.trend?.length)
  )

  if (renderable.length === 0) {
    return (
      <section className="rounded-lg border border-border/25 bg-linen px-4 py-5 shadow-soft">
        <h2 className="text-lg font-semibold text-earth">Charts</h2>
        <p className="mt-1 text-sm leading-6 text-earth/70">
          No clear chartable fields were found {activeFilters > 0 ? 'after these filters.' : 'in this table yet.'}
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-earth">Charts</h2>
          <p className="text-sm leading-6 text-earth/70">
            {activeFilters > 0 ? 'Redrawn for the current filters.' : 'Built from the live BigQuery column summary.'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {renderable.map((column) => {
          if (column.type === 'numeric') return <NumericChart key={column.name} column={column} />
          if (column.type === 'categorical') return <CategoricalChart key={column.name} column={column} />
          return <TemporalChart key={column.name} column={column} />
        })}
      </div>
    </section>
  )
}

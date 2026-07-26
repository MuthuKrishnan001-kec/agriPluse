import { useState, useMemo } from 'react'
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

function formatCompactNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value ?? '')
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(number)
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

  if (column.type === 'year') {
    const largest = [...(column.trend || [])].sort((a, b) => b.count - a.count)[0]
    if (!largest) return `${humanizeName(column.name)} has no yearly records in this view.`
    return `Year ${largest.year} has the highest record count, with ${formatNumber(largest.count)} entries.`
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

// ---------------------------------------------------------------------------
// Premium Custom Interactive Tooltip
// ---------------------------------------------------------------------------
const CustomTooltip = ({ active, payload, label, chartType }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-border bg-soil p-3 text-xs text-linen shadow-xl">
        {chartType === 'numeric' && (
          <div>
            <div className="font-semibold text-wheat mb-1">Range: {data.bucket}</div>
            <div className="flex justify-between gap-4">
              <span className="text-linen/70">Total:</span>
              <span className="font-mono font-semibold">{formatNumber(data.sumMetric)}</span>
            </div>
          </div>
        )}
        {chartType === 'categorical' && (
          <div>
            <div className="font-semibold text-crop mb-1">Category: {data.value}</div>
            <div className="flex justify-between gap-4">
              <span className="text-linen/70">Count:</span>
              <span className="font-mono font-semibold">{formatNumber(data.count)} records</span>
            </div>
          </div>
        )}
        {chartType === 'temporal' && (
          <div>
            <div className="font-semibold text-accent mb-1">Period: {data.period}</div>
            <div className="flex justify-between gap-4">
              <span className="text-linen/70">Count:</span>
              <span className="font-mono font-semibold">{formatNumber(data.count)} records</span>
            </div>
          </div>
        )}
        {chartType === 'year' && (
          <div>
            <div className="font-semibold text-wheat mb-1">Year: {data.year}</div>
            <div className="flex justify-between gap-4">
              <span className="text-linen/70">Total:</span>
              <span className="font-mono font-semibold">{formatNumber(data.totalMetric)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }
  return null
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
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={45} tickFormatter={formatCompactNumber} />
          <Tooltip content={<CustomTooltip chartType="numeric" />} cursor={{ fill: `${COLORS.border}66` }} />
          <Bar dataKey="sumMetric" fill={COLORS.wheat} radius={[4, 4, 0, 0]} />
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

  // Sort categorical data descending by count
  const sortedData = useMemo(() => {
    return [...(column.top_values || [])].sort((a, b) => b.count - a.count)
  }, [column.top_values])

  return (
    <ChartCard title={humanizeName(column.name)} caption={buildCaption(column)} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" onClick={handleClick} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.28} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
          <YAxis dataKey="value" type="category" width={112} tick={AXIS_STYLE} tickFormatter={(value) => trimLabel(value)} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip chartType="categorical" />} cursor={{ fill: `${COLORS.border}66` }} />
          <Bar dataKey="count" fill={COLORS.crop} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function YearChart({ column }) {
  const [detail, setDetail] = useState(null)

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    if (!payload) return
    setDetail({ label: String(payload.year), value: `${formatNumber(payload.totalMetric)}` })
  }

  return (
    <ChartCard title={humanizeName(column.name)} caption={buildCaption(column)} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={column.trend} onClick={handleClick} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.28} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={45} tickFormatter={formatCompactNumber} />
          <Tooltip content={<CustomTooltip chartType="year" />} />
          <Line type="monotone" dataKey="totalMetric" stroke={COLORS.accent} strokeWidth={3} dot={{ r: 4, fill: COLORS.accent }} activeDot={{ r: 7, fill: COLORS.wheat, stroke: COLORS.earth, strokeWidth: 2 }} />
        </LineChart>
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
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={45} tickFormatter={formatCompactNumber} />
          <Tooltip content={<CustomTooltip chartType="temporal" />} />
          <Line type="monotone" dataKey="count" stroke={COLORS.accent} strokeWidth={3} dot={{ r: 4, fill: COLORS.accent }} activeDot={{ r: 7, fill: COLORS.wheat, stroke: COLORS.earth, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export default function ChartGrid({ columns, activeFilters = 0 }) {
  if (!columns || columns.length === 0) return null

  // Filter columns to render:
  // Categorical is ONLY rendered when there is more than 1 category (length > 1)
  const renderable = useMemo(() => {
    return columns.filter((column) =>
      (column.type === 'numeric' && column.histogram?.length) ||
      (column.type === 'categorical' && column.top_values?.length > 1) ||
      (column.type === 'temporal' && column.trend?.length) ||
      (column.type === 'year' && column.trend?.length)
    )
  }, [columns])

  if (renderable.length === 0) {
    return (
      <section className="rounded-lg border border-border/25 bg-linen px-4 py-5 shadow-soft">
        <h2 className="text-xl font-semibold text-earth">Charts</h2>
        <p className="mt-1 text-sm leading-6 text-earth/70">
          No clear multi-value chartable fields were found {activeFilters > 0 ? 'after these filters.' : 'in this table yet.'}
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
            {activeFilters > 0 ? 'Redrawn for the current filters (single-value charts are hidden).' : 'Built from the live BigQuery column summary.'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {renderable.map((column) => {
          if (column.type === 'numeric') return <NumericChart key={column.name} column={column} />
          if (column.type === 'categorical') return <CategoricalChart key={column.name} column={column} />
          if (column.type === 'year') return <YearChart key={column.name} column={column} />
          return <TemporalChart key={column.name} column={column} />
        })}
      </div>
    </section>
  )
}

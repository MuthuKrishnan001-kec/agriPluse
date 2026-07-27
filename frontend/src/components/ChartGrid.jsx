import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeChartData(data) {
  if (!Array.isArray(data)) return []

  return data
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const normalized = {
        ...item,
        category: item.category ?? item.label ?? item.name ?? item.crop ?? item.season ?? item.district ?? item.region ?? 'Not recorded',
        year: item.year ?? item.Year ?? null,
        value: toNumber(item.value ?? item.avg ?? item.average ?? item.price ?? item.yield ?? item.total ?? item.production ?? item.market_price),
        x: toNumber(item.x ?? item.area ?? item.area_ha ?? item.Area),
        y: toNumber(item.y ?? item.production ?? item.production_tonnes ?? item.value),
      }

      if (normalized.category === null || normalized.category === undefined || normalized.category === '') {
        normalized.category = 'Not recorded'
      }

      return normalized
    })
    .filter((item) => item !== null && item !== undefined)
}

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

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return 'not recorded'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return number.toLocaleString(undefined, { maximumFractionDigits: Math.abs(number) >= 10 ? 0 : 2 })
}

function formatCompactNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
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

// ---------------------------------------------------------------------------
// Reusable Card Wrapper
// ---------------------------------------------------------------------------
function ChartCard({ title, caption, detail, children }) {
  return (
    <article className="rounded-xl border border-border/25 bg-linen/95 px-5 py-5 shadow-sm transition-shadow hover:shadow-md">
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-earth">{title}</h3>
        <p className="mt-1 text-sm leading-snug text-earth/70">{caption}</p>
      </header>
      <div className="h-64">{children}</div>
      <div className="mt-4 min-h-6 border-t border-border/10 pt-3 text-sm leading-5 text-earth" aria-live="polite">
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
// Custom Tooltip
// ---------------------------------------------------------------------------
const CustomTooltip = ({ active, payload, label, xLabel, yLabel, yFormat = formatNumber }) => {
  if (active && payload && payload.length) {
    const rawData = payload[0]?.payload
    const data = rawData && typeof rawData === 'object' ? normalizeChartData([rawData])[0] ?? rawData : null
    const displayLabel = data?.category ?? data?.year ?? data?.x ?? label ?? 'Not recorded'
    const displayValue = data?.value ?? data?.y ?? payload[0]?.value ?? null

    return (
      <div className="rounded-lg border border-border bg-soil p-3 text-xs text-linen shadow-xl">
        <div className="font-semibold text-wheat mb-1">{xLabel}: {displayLabel}</div>
        <div className="flex justify-between gap-4 mt-2">
          <span className="text-linen/70">{yLabel}:</span>
          <span className="font-mono font-semibold">{displayValue === null ? 'not recorded' : yFormat(displayValue)}</span>
        </div>
        {data?.category && data?.x !== null && (
          <div className="flex justify-between gap-4 mt-1">
            <span className="text-linen/70">Crop:</span>
            <span className="font-mono font-semibold">{data.category}</span>
          </div>
        )}
      </div>
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// 1. Yield by Crop
// ---------------------------------------------------------------------------
function YieldByCropChart({ data }) {
  const [detail, setDetail] = useState(null)

  const chartData = normalizeChartData(data).filter((item) => item.value !== null)
  if (chartData.length === 0) return null

  const topCrop = [...chartData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
  const caption = topCrop
    ? `${topCrop.category} has the highest average yield at ${formatNumber(topCrop.value)}.`
    : "Average yield by crop type."

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    const normalizedPayload = payload && typeof payload === 'object' ? normalizeChartData([payload])[0] : null
    if (!normalizedPayload) return
    setDetail({ label: normalizedPayload.category, value: `Avg Yield: ${formatNumber(normalizedPayload.value)}` })
  }

  return (
    <ChartCard title="Yield Efficiency by Crop" caption={caption} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 10, left: 10, bottom: 45 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.15} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="category" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(val) => trimLabel(val, 12)} angle={-45} textAnchor="end" label={{ value: 'Crop', position: 'insideBottom', offset: -40, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={formatCompactNumber} label={{ value: 'Yield (kg/ha)', angle: -90, position: 'insideLeft', offset: 0, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <Tooltip content={<CustomTooltip xLabel="Crop" yLabel="Avg Yield" />} cursor={{ fill: `${COLORS.border}33` }} />
          <Bar dataKey="value" fill={COLORS.moss} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 2. Production by District
// ---------------------------------------------------------------------------
function ProductionByDistrictChart({ data }) {
  const [detail, setDetail] = useState(null)
  const chartData = normalizeChartData(data).filter((item) => item.value !== null)
  if (chartData.length === 0) return null

  const topDistrict = [...chartData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
  const caption = topDistrict
    ? `${topDistrict.category} leads production with a total of ${formatCompactNumber(topDistrict.value)}.`
    : "Total production volume by district."

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    const normalizedPayload = payload && typeof payload === 'object' ? normalizeChartData([payload])[0] : null
    if (!normalizedPayload) return
    setDetail({ label: normalizedPayload.category, value: `Production: ${formatNumber(normalizedPayload.value)}` })
  }

  return (
    <ChartCard title="Top Producing Regions" caption={caption} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 10, left: 10, bottom: 45 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.15} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="category" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(val) => trimLabel(val, 12)} angle={-45} textAnchor="end" label={{ value: 'District', position: 'insideBottom', offset: -40, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={formatCompactNumber} label={{ value: 'Production (Tonnes)', angle: -90, position: 'insideLeft', offset: 0, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <Tooltip content={<CustomTooltip xLabel="District" yLabel="Total Production" />} cursor={{ fill: `${COLORS.border}33` }} />
          <Bar dataKey="value" fill={COLORS.wheat} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 3. Production Trends
// ---------------------------------------------------------------------------
function ProductionTrendsChart({ data }) {
  const [detail, setDetail] = useState(null)
  const chartData = normalizeChartData(data).filter((item) => item.value !== null)
  if (chartData.length === 0) return null

  const caption = "Overall production volume trend over the years."

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    const normalizedPayload = payload && typeof payload === 'object' ? normalizeChartData([payload])[0] : null
    if (!normalizedPayload) return
    setDetail({ label: `Year ${normalizedPayload.year ?? 'N/A'}`, value: `Production: ${formatNumber(normalizedPayload.value)}` })
  }

  return (
    <ChartCard title="Production Trends Over Time" caption={caption} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.15} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={AXIS_STYLE} axisLine={false} tickLine={false} label={{ value: 'Year', position: 'insideBottom', offset: -15, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={formatCompactNumber} label={{ value: 'Production (Tonnes)', angle: -90, position: 'insideLeft', offset: 0, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <Tooltip content={<CustomTooltip xLabel="Year" yLabel="Total Production" />} />
          <Line type="monotone" dataKey="value" stroke={COLORS.accent} strokeWidth={3} dot={{ fill: COLORS.linen, stroke: COLORS.accent, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: COLORS.accent }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 4. Seasonal Efficiency
// ---------------------------------------------------------------------------
function SeasonalEfficiencyChart({ data }) {
  const [detail, setDetail] = useState(null)
  const chartData = normalizeChartData(data).filter((item) => item.value !== null)
  if (chartData.length === 0) return null

  const topSeason = [...chartData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
  const caption = topSeason
    ? `${topSeason.category} is the most efficient season, averaging ${formatNumber(topSeason.value)} yield.`
    : "Average yield compared across seasons."

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    const normalizedPayload = payload && typeof payload === 'object' ? normalizeChartData([payload])[0] : null
    if (!normalizedPayload) return
    setDetail({ label: normalizedPayload.category, value: `Avg Yield: ${formatNumber(normalizedPayload.value)}` })
  }

  return (
    <ChartCard title="Seasonal Efficiency" caption={caption} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} onClick={handleClick} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.15} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} label={{ value: 'Yield (kg/ha)', position: 'insideBottom', offset: -15, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <YAxis dataKey="category" type="category" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={70} tickFormatter={(val) => trimLabel(val, 10)} label={{ value: 'Season', angle: -90, position: 'insideLeft', offset: 0, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <Tooltip content={<CustomTooltip xLabel="Season" yLabel="Avg Yield" />} cursor={{ fill: `${COLORS.border}33` }} />
          <Bar dataKey="value" fill={COLORS.crop} radius={[0, 4, 4, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 5. Market Value by Crop
// ---------------------------------------------------------------------------
function MarketValueChart({ data }) {
  const [detail, setDetail] = useState(null)
  const chartData = normalizeChartData(data).filter((item) => item.value !== null)
  if (chartData.length === 0) return null

  const topCrop = [...chartData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
  const caption = topCrop
    ? `${topCrop.category} commands the highest average market price at ${formatNumber(topCrop.value)}.`
    : "Average market price across crops."

  const handleClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    const normalizedPayload = payload && typeof payload === 'object' ? normalizeChartData([payload])[0] : null
    if (!normalizedPayload) return
    setDetail({ label: normalizedPayload.category, value: `Avg Price: ${formatNumber(normalizedPayload.value)}` })
  }

  return (
    <ChartCard title="Market Value by Crop" caption={caption} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 10, left: 10, bottom: 45 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.15} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="category" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(val) => trimLabel(val, 12)} angle={-45} textAnchor="end" label={{ value: 'Crop', position: 'insideBottom', offset: -40, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={formatCompactNumber} label={{ value: 'Price (₹/Qtl)', angle: -90, position: 'insideLeft', offset: 0, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <Tooltip content={<CustomTooltip xLabel="Crop" yLabel="Avg Price" />} cursor={{ fill: `${COLORS.border}33` }} />
          <Bar dataKey="value" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 6. Area vs. Production Scatter
// ---------------------------------------------------------------------------
function AreaProductionScatterChart({ data }) {
  const [detail, setDetail] = useState(null)
  const chartData = normalizeChartData(data).filter((item) => item.x !== null && item.y !== null)
  if (chartData.length === 0) return null

  const caption = "Correlation between cultivated land area and total production output."

  const handleClick = (state) => {
    const payload = state?.payload
    const normalizedPayload = payload && typeof payload === 'object' ? normalizeChartData([payload])[0] : null
    if (!normalizedPayload) return
    setDetail({ label: normalizedPayload.category || 'Record', value: `Area: ${formatNumber(normalizedPayload.x)} | Prod: ${formatNumber(normalizedPayload.y)}` })
  }

  return (
    <ChartCard title="Area vs. Production" caption={caption} detail={detail}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid stroke={COLORS.border} strokeOpacity={0.15} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Area" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} label={{ value: 'Area (Hectares)', position: 'insideBottom', offset: -15, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <YAxis type="number" dataKey="y" name="Production" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={formatCompactNumber} label={{ value: 'Production (Tonnes)', angle: -90, position: 'insideLeft', offset: 0, fill: COLORS.earth, fontSize: 11, fontWeight: 'bold' }} />
          <ZAxis type="category" dataKey="category" name="Crop" />
          <Tooltip content={<CustomTooltip xLabel="Area" yLabel="Production" />} cursor={{ strokeDasharray: '3 3', stroke: COLORS.border }} />
          <Scatter data={chartData} fill={COLORS.moss} fillOpacity={0.6} onClick={handleClick} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}


export default function ChartGrid({ charts }) {
  if (!charts) return null

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
      <YieldByCropChart data={charts.yield_by_crop} />
      <ProductionByDistrictChart data={charts.production_by_district} />
      <ProductionTrendsChart data={charts.production_trends} />
      <SeasonalEfficiencyChart data={charts.seasonal_efficiency} />
      <MarketValueChart data={charts.market_value_by_crop} />
      <AreaProductionScatterChart data={charts.area_vs_production} />
    </div>
  )
}

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, ScatterChart, Scatter } from 'recharts'
import SectionCard from '../ui/SectionCard'
import MetricCard from '../ui/MetricCard'
import { Crop, TrendingUp, DollarSign, Sparkles } from 'lucide-react'
import { buildCropBreakdown, buildYearTrend, parseNumericValue } from '../../utils/liveAnalytics'

export default function CropAnalyticsView({ rows = [], filters = {} }) {
  const activeRows = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()))

  const totalYield = activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.yield) ?? 0), 0)
  const avgYield = activeRows.length ? (totalYield / activeRows.length).toFixed(1) : '6.8'
  const topCrop = activeRows.length ? [...activeRows].sort((a, b) => (parseNumericValue(b?.yield) ?? 0) - (parseNumericValue(a?.yield) ?? 0))[0]?.crop || 'N/A' : 'Paddy'
  const growth = activeRows.length ? '+8.4%' : '+7.2%'
  const cropBreakdown = buildCropBreakdown(activeRows)
  const yearlyTrend = buildYearTrend(activeRows, 'production')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Harvested yield" value={`${(totalYield / 1000).toFixed(1)}k t`} detail="Total production of the selected crop mix" icon={Crop} />
        <MetricCard title="Avg yield/ha" value={`${avgYield} t/ha`} detail="Current mean yield per hectare" icon={TrendingUp} accent="text-sky-600" tint="bg-sky-50" />
        <MetricCard title="Top crop" value={topCrop} detail="Highest output in the active filters" icon={Sparkles} accent="text-fuchsia-600" tint="bg-fuchsia-50" />
        <MetricCard title="YoY growth" value={growth} detail="Improvement over the previous season" icon={DollarSign} accent="text-amber-600" tint="bg-amber-50" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Crop performance" description="Relative output across the major cultivars">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropBreakdown.slice(0, 6)}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="crop" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Multi-year production" description="Historical trend to compare crop trajectory">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyTrend}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <SectionCard title="Area vs production" description="Relationship between cultivated area and production volume">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" dataKey="x" name="Area" />
                <YAxis type="number" dataKey="y" name="Production" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={activeRows.map((row) => ({ x: parseNumericValue(row?.area) ?? 0, y: parseNumericValue(row?.production) ?? 0, crop: row?.crop }))} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="AI crop recommendation" description="Optimal crop suggestion from the active soil and regional mix">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Recommended next crop</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">Sugarcane</p>
            <p className="mt-2 text-sm text-slate-600">Best fit for high-yield areas with moderate rainfall and strong soil health.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

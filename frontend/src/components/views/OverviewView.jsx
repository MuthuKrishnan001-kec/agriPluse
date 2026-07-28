import { Activity, AlertTriangle, Droplets, Sprout } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import MetricCard from '../ui/MetricCard'
import SectionCard from '../ui/SectionCard'
import AgriDataTable from '../AgriDataTable'
import { buildCropBreakdown, buildDistrictLeaderboard, buildYearTrend, parseNumericValue } from '../../utils/liveAnalytics'

const colors = ['#10b981', '#0f766e', '#34d399', '#64748b']

function formatPercent(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export default function OverviewView({ rows = [], filters = {} }) {
  const activeRows = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()))

  const totalYield = activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.yield) ?? 0), 0)
  const topDistrict = activeRows.length ? [...activeRows].sort((a, b) => (parseNumericValue(b?.yield) ?? 0) - (parseNumericValue(a?.yield) ?? 0))[0] : null
  const avgSoil = activeRows.length ? Math.round(activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.ph) ?? 0), 0) / activeRows.length) : 78
  const riskTrend = activeRows.length ? Math.round((1 - activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.rainfall) ?? 0), 0) / activeRows.length / 1000) * 100) : 78
  const yearlyTrend = buildYearTrend(activeRows, 'yield')
  const cropBreakdown = buildCropBreakdown(activeRows)
  const districtLeaderboard = buildDistrictLeaderboard(activeRows)

  const insight = activeRows.length
    ? `${formatPercent(Math.round(((yearlyTrend[yearlyTrend.length - 1]?.value || 0) - (yearlyTrend[0]?.value || 0)) / Math.max(yearlyTrend[0]?.value || 1, 1) * 100))} uplift in output since ${yearlyTrend[0]?.year || 'the first available year'} for the active filter mix.`
    : 'Select a crop and region to unlock the latest field anomalies.'

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Estimated yield" value={`${(totalYield / 1000).toFixed(1)}k t`} detail="Aggregated harvested output for the active view" icon={Sprout} />
        <MetricCard title="Top district" value={topDistrict ? String(topDistrict.district_name || 'N/A') : 'North Belt'} detail={topDistrict ? `${topDistrict.crop || 'Crop'} • ${topDistrict.year || 'Live'}` : 'High-performing region'} icon={Activity} accent="text-cyan-600" tint="bg-cyan-50" />
        <MetricCard title="Avg soil health" value={`${avgSoil}/100`} detail="Composite pH signal from the active records" icon={Droplets} accent="text-amber-600" tint="bg-amber-50" />
        <MetricCard title="Climate risk" value={`${riskTrend}% safe`} detail="Lower risk corridor based on rainfall balance" icon={AlertTriangle} accent="text-rose-600" tint="bg-rose-50" />
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-emerald-800">Dynamic AI insight</p>
            <p className="mt-1">{insight}</p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Anomaly watch</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <SectionCard title="Historical yield trend" description="Multi-year trend with current filter context">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyTrend}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Regional yield distribution" description="Yield concentration across the selected districts">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cropBreakdown.slice(0, 6)} dataKey="value" nameKey="crop" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {cropBreakdown.slice(0, 6).map((entry, index) => (
                    <Cell key={entry.crop} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Interactive farm data table" description="Preview the active records with search, sorting, pagination, and CSV export">
        <AgriDataTable rows={activeRows} title="Filtered farm records" />
      </SectionCard>

      <SectionCard title="Quick farm advice" description="Short recommendations tailored to the current selection">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Focus on high-yield zones', detail: 'Prioritize the districts with the strongest production volumes in this filter mix.' },
            { title: 'Balance soil nutrients', detail: 'Use the active pH and rainfall profile to guide fertilizer timing.' },
            { title: 'Watch weather volatility', detail: 'Keep irrigation planning aligned with the current rainfall trend.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

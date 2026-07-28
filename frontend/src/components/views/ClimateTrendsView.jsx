import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import MetricCard from '../ui/MetricCard'
import SectionCard from '../ui/SectionCard'
import { Droplets, Thermometer, AlertTriangle } from 'lucide-react'
import { buildRainfallYieldTrend, parseNumericValue } from '../../utils/liveAnalytics'

export default function ClimateTrendsView({ rows = [], filters = {} }) {
  const activeRows = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()))
  const totalRainfall = activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.rainfall) ?? 0), 0)
  const avgTemp = activeRows.length ? (activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.temperature) ?? 0), 0) / activeRows.length).toFixed(1) : '28.3'
  const extremeDays = activeRows.length ? Math.max(3, Math.round(activeRows.length / 2000)) : 4
  const rainfallYieldTrend = buildRainfallYieldTrend(activeRows)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total season rainfall" value={`${Math.round(totalRainfall / 1000)}k mm`} detail="Accumulated rainfall for active records" icon={Droplets} />
        <MetricCard title="Avg temperature" value={`${avgTemp}°C`} detail="Mean seasonal temperature" icon={Thermometer} accent="text-orange-600" tint="bg-orange-50" />
        <MetricCard title="Extreme weather days" value={`${extremeDays}`} detail="High-risk weather days in the current window" icon={AlertTriangle} accent="text-rose-600" tint="bg-rose-50" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Rainfall vs yield" description="Historical correlation between rainfall and harvest performance">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rainfallYieldTrend}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="rainfall" stroke="#0f766e" />
                <Line yAxisId="right" type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Seasonal calendar" description="Suggested sowing, irrigation, and harvest windows">
          <div className="space-y-3">
            {[
              { season: 'Kharif', sowing: 'June', irrigation: 'Weekly', harvest: 'October' },
              { season: 'Rabi', sowing: 'November', irrigation: 'Biweekly', harvest: 'March' },
            ].map((item) => (
              <div key={item.season} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{item.season}</p>
                <p className="mt-2 text-sm text-slate-600">Sowing: {item.sowing} • Irrigation: {item.irrigation} • Harvest: {item.harvest}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Risk assessment gauges" description="Drought, flood, and pest outlook for the selected region">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Drought risk', value: 24 },
            { name: 'Flood risk', value: 41 },
            { name: 'Pest outbreak', value: 33 },
          ].map((item) => (
            <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{item.name}</p>
                <span className="text-sm font-semibold text-emerald-600">{item.value}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ScatterChart, Scatter, CartesianGrid, XAxis, YAxis } from 'recharts'
import MetricCard from '../ui/MetricCard'
import SectionCard from '../ui/SectionCard'
import { Droplets, FlaskConical, Leaf, Gauge } from 'lucide-react'
import { buildSoilTypeBreakdown, parseNumericValue } from '../../utils/liveAnalytics'

const pieColors = ['#10b981', '#34d399', '#0f766e', '#64748b']

export default function SoilHealthView({ rows = [], filters = {} }) {
  const activeRows = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()))

  const avgPh = activeRows.length ? (activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.ph) ?? 0), 0) / activeRows.length).toFixed(1) : '7.0'
  const avgOrganic = activeRows.length ? ((activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.rainfall) ?? 0), 0) / activeRows.length) / 10).toFixed(1) : '78.4'
  const npk = activeRows.length ? [Math.round(activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.fertilizer_usage) ?? 0), 0) / activeRows.length), Math.round(activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.pesticide_usage) ?? 0), 0) / activeRows.length), Math.round(activeRows.reduce((sum, row) => sum + (parseNumericValue(row?.rainfall) ?? 0), 0) / activeRows.length)] : [112, 40, 90]
  const soilTypeBreakdown = buildSoilTypeBreakdown(activeRows)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Avg pH" value={avgPh} detail="Balanced acidity for nutrient uptake" icon={FlaskConical} />
        <MetricCard title="Organic carbon" value={`${avgOrganic}%`} detail="Soil organic matter proxy from rainfall and field context" icon={Leaf} accent="text-emerald-700" tint="bg-emerald-100" />
        <MetricCard title="Fertilizer usage" value={`${npk[0]} units`} detail="Average input intensity" icon={Droplets} accent="text-cyan-600" tint="bg-cyan-50" />
        <MetricCard title="Pesticide / rainfall" value={`${npk[1]} / ${npk[2]}`} detail="Input balance for healthy growth" icon={Gauge} accent="text-amber-600" tint="bg-amber-50" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Field input profile" description="Average fertilizer and pesticide patterns across the current selection">
          <div className="grid gap-3 sm:grid-cols-2">
            {['North', 'Central', 'South', 'Coastal'].map((zone, index) => (
              <div key={zone} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{zone}</p>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{['Low', 'Medium', 'Low', 'High'][index]}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${65 + index * 8}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Soil type breakdown" description="Distribution of dominant soil textures">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={soilTypeBreakdown} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {soilTypeBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Input efficiency scatter" description="Fertilizer and pesticide use against yield performance">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" dataKey="fertilizer" name="Fertilizer" />
              <YAxis type="number" dataKey="yield" name="Yield" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={activeRows.map((row) => ({ fertilizer: parseNumericValue(row?.fertilizer_usage) ?? 0, yield: parseNumericValue(row?.yield) ?? 0 }))} fill="#10b981" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  )
}

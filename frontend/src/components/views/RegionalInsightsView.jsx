import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import SectionCard from '../ui/SectionCard'
import { buildDistrictLeaderboard } from '../../utils/liveAnalytics'

export default function RegionalInsightsView({ rows = [], filters = {} }) {
  const activeRows = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()))
  const districtLeaderboard = buildDistrictLeaderboard(activeRows).slice(0, 6)

  return (
    <div className="space-y-6">
      <SectionCard title="Regional yield map" description="Regional density and risk profile across core zones">
        <div className="grid gap-4 md:grid-cols-3">
          {districtLeaderboard.slice(0, 3).map((district) => (
            <div key={district.district_name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{district.district_name}</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">{district.yield_rate.toFixed(1)} t/ha</p>
              <p className="mt-2 text-sm text-slate-500">Output: {district.total_output_tons.toFixed(0)} t</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="District leaderboard" description="Ranked by output, hectares cultivated, and yield rate">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">District</th>
                  <th className="px-3 py-2">Output</th>
                  <th className="px-3 py-2">Ha</th>
                  <th className="px-3 py-2">Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districtLeaderboard.map((district) => (
                  <tr key={district.district_name}>
                    <td className="px-3 py-2 font-medium text-slate-900">{district.district_name}</td>
                    <td className="px-3 py-2">{district.total_output_tons.toLocaleString()} t</td>
                    <td className="px-3 py-2">{district.cultivated_ha.toLocaleString()}</td>
                    <td className="px-3 py-2">{district.yield_rate.toFixed(2)} t/ha</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Side-by-side regional comparison" description="Compare the leading districts and their agronomic profile">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtLeaderboard.slice(0, 4)}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="district_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="yield_rate" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

import { ArrowUpRight } from 'lucide-react'

export default function MetricCard({ title, value, detail, icon: Icon, accent = 'text-emerald-600', tint = 'bg-emerald-50' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-xl p-2 ${tint}`}>
          {Icon ? <Icon className={`h-5 w-5 ${accent}`} /> : <ArrowUpRight className={`h-5 w-5 ${accent}`} />}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </div>
  )
}

import { BarChart2, Crop, MapPin, Leaf, Calendar, Bot } from 'lucide-react';
export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="w-full border-b border-border bg-soil p-4 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r md:p-5 lg:w-80">
      <div className="rounded-2xl border border-furrow bg-soil2/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-crop/10 text-xl shadow-inner border border-crop/20">🌿</div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-crop">AgriPulse</div>
            <div className="text-sm font-medium text-slate-400">Live farm insight</div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-furrow bg-soil p-3.5 text-sm text-slate-300 shadow-inner">
          <div className="font-semibold text-white">Your records</div>
          <p className="mt-1 leading-relaxed text-slate-400">Explore live trends from the active farm dataset.</p>
        </div>

        <div className="mt-6">
          <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Browse</div>
          <ul className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-5 h-5 mr-2" /> },
              { id: 'crop', label: 'Crop & Yield Analytics', icon: <Crop className="w-5 h-5 mr-2" /> },
              { id: 'regional', label: 'Regional Insights', icon: <MapPin className="w-5 h-5 mr-2" /> },
              { id: 'soil', label: 'Soil & Input Health', icon: <Leaf className="w-5 h-5 mr-2" /> },
              { id: 'climate', label: 'Seasonal & Climate Trends', icon: <Calendar className="w-5 h-5 mr-2" /> },
              { id: 'advice', label: 'Farm Advice & AI Logs', icon: <Bot className="w-5 h-5 mr-2" /> },
            ].map(item => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`flex w-full items-center rounded-xl px-3.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crop ${activeView === item.id ? 'bg-emerald-600/20 text-emerald-400 font-semibold border-l-2 border-emerald-500' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}


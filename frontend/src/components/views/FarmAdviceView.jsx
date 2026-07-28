import { Bot, Download, ThumbsUp, ThumbsDown } from 'lucide-react'
import SectionCard from '../ui/SectionCard'

export default function FarmAdviceView({ rows = [], filters = {} }) {
  const activeRows = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row?.[key] ?? '').toLowerCase() === String(value).toLowerCase()))
  const adviceCards = [
    { title: 'High-yield focus', detail: 'Give priority to districts with the strongest current production volume.' },
    { title: 'Input timing', detail: 'Use the current rainfall profile to schedule irrigation and fertilizer application.' },
    { title: 'Risk monitoring', detail: 'Track temperature and rainfall movement to reduce weather-related losses.' },
  ]

  const aiLogs = [
    { id: 1, prompt: 'What should I prioritize?', response: 'Focus on the top-yielding districts and align irrigation with current rainfall.', timestamp: 'Just now', feedback: 'Helpful' },
    { id: 2, prompt: 'How should I adjust inputs?', response: 'Reduce input intensity in high-volume zones and re-check crop-specific timing.', timestamp: 'Today', feedback: 'Useful' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {adviceCards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">{card.title}</p>
            <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
          </div>
        ))}
      </div>

      <SectionCard title="AI assistant prompt box" description="Ask the assistant about field conditions, nutrients, or sowing windows">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot className="h-4 w-4 text-emerald-600" /> Ask AgriPulse
          </div>
          <textarea className="mt-3 h-24 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500" placeholder="What is the best fertilizer dose for Clay soil in Zone 1?" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Responses are derived from your selected filters and live field conditions. {activeRows.length} matching records are in scope.</p>
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Send prompt</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="AI recommendation audit log" description="Review past responses and record feedback" action={<button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Download className="h-4 w-4" /> Export report</button>}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Prompt</th>
                <th className="px-3 py-2">Response</th>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aiLogs.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{item.prompt}</td>
                  <td className="px-3 py-2 text-slate-600">{item.response}</td>
                  <td className="px-3 py-2 text-slate-600">{item.timestamp}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{item.feedback}</span>
                      <button className="rounded-full border border-slate-200 p-1"><ThumbsUp className="h-4 w-4" /></button>
                      <button className="rounded-full border border-slate-200 p-1"><ThumbsDown className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

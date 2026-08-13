import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { ocrLogs } from '../data/dummy'

const statusBadge: Record<string, { bg: string; color: string }> = {
  'Success': { bg: '#d4edda', color: '#3C763D' },
  'Error': { bg: '#fde8e8', color: '#C0392B' },
}

export default function OcrMonitoring() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = ocrLogs.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.roll.toLowerCase().includes(q) || r.admin.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">OCR Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">Real-time log of camera scale weight recognition events</p>
      </div>

      <div className="card p-3 sm:p-4 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roll, admin, ID..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-input text-xs py-1.5"
          >
            <option value="All">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Error">Error</option>
          </select>
          <span className="text-xs font-semibold text-slate-500 ml-2">{filtered.length} records</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1200px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[110px]" />
            <col className="w-[210px]" />
            <col className="w-[110px]" />
            <col className="w-[170px]" />
            <col className="w-[130px]" />
            <col className="w-[180px]" />
            <col className="w-[170px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-center" style={{ textAlign: 'center' }}>ID</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Timestamp</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Roll</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Detected Weight</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Status</th>
              <th>Error Reason</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Administrator</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const sc = statusBadge[r.status] || { bg: '#EEEEEE', color: '#333' }
              return (
                <tr key={r.id}>
                  <td className="text-center font-mono text-xs text-slate-500">{r.id}</td>
                  <td className="text-center text-xs text-slate-600">{r.timestamp}</td>
                  <td className="text-center font-bold text-blue-700 font-mono text-xs">{r.roll}</td>
                  <td className="text-center font-mono text-xs font-bold text-slate-900">{r.detectedWeight}</td>
                  <td className="text-center">
                    <div className="flex w-full justify-center">
                      <span className="badge inline-flex min-w-[82px] justify-center" style={{ backgroundColor: sc.bg, color: sc.color }}>{r.status}</span>
                    </div>
                  </td>
                  <td className={`text-xs ${r.error === '-' ? 'text-slate-400' : 'text-red-600 font-semibold'}`}>{r.error}</td>
                  <td className="text-center text-xs text-slate-700">{r.admin}</td>
                  <td className="text-center text-xs text-slate-700">{r.result}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

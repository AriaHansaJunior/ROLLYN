import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { usePage } from '@inertiajs/react'

export default function Jop() {
  const { jopData = [] } = usePage<any>().props;
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const processedJop = jopData.map(r => {
    const status = r.progress >= 100 ? 'Complete' : r.progress > 0 ? 'In Progress' : 'Pending'
    const colorClass = r.progress >= 100 ? 'bg-green-500 text-green-700' : r.progress >= 60 ? 'bg-blue-600 text-blue-700' : 'bg-amber-500 text-amber-700'
    const barBg = r.progress >= 100 ? 'bg-green-500' : r.progress >= 60 ? 'bg-blue-600' : 'bg-amber-500'
    return { ...r, status, colorClass, barBg }
  })

  const filtered = processedJop.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || 
      r.jop.toLowerCase().includes(q) || 
      r.spk.toLowerCase().includes(q) || 
      r.po.toLowerCase().includes(q) || 
      r.customer.toLowerCase().includes(q) ||
      r.grade.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Job Order Production (JOP)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manufacturing execution tracking and completion status by production order</p>
      </div>

      <div className="card p-3 sm:p-4 grid grid-cols-1 min-[760px]:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full min-[760px]:flex-1 min-w-0">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search JOP, SPK, PO, customer, grade..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 justify-between w-full min-[760px]:w-auto min-[760px]:justify-end">
          <div className="flex items-center gap-1.5 min-w-0">
            <Filter size={13} className="text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-input text-xs py-1.5 min-w-[130px] w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Complete">Complete</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="min-[760px]:col-span-2 mt-1 min-[760px]:mt-0">
          <span className="text-xs font-semibold text-slate-500">Total: {filtered.length} records</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1150px] lg:min-w-[980px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[200px]" />
            <col className="w-[120px] lg:w-[100px]" />
            <col className="w-[120px] lg:w-[110px]" />
            <col className="w-[120px] lg:w-[110px]" />
            <col className="w-[170px] lg:w-[160px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>SPK</th>
              <th style={{ textAlign: 'center' }}>PO</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>Target Rolls</th>
              <th style={{ textAlign: 'center' }}>Completed</th>
              <th style={{ textAlign: 'center' }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.jop}>
                <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.jop}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.spk}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.po}</td>
                <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{r.customer}</td>
                <td style={{ textAlign: 'center' }}>{r.grade}</td>
                <td className="font-semibold" style={{ textAlign: 'center' }}>{r.target}</td>
                <td className="font-bold text-slate-900" style={{ textAlign: 'center' }}>{r.rolls}</td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-full max-w-[90px] h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.barBg}`} style={{ width: `${Math.min(r.progress, 100)}%` }} />
                    </div>
                    <span className={`text-[11px] font-bold w-9 text-right ${r.colorClass.split(' ')[1]}`}>{r.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

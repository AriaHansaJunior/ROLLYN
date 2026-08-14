import { useState } from 'react'
import { Search } from 'lucide-react'
import { targetOrders } from '../data/dummy'

export default function TargetOrder() {
  const [search, setSearch] = useState('')
  const filtered = targetOrders.filter(r => {
    const q = search.toLowerCase()
    return !q || r.spk.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q)
  })

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Target Order</h2>
        <p className="text-xs text-slate-500 mt-0.5">Production fulfillment targets and container assignment schedule</p>
      </div>

      <div className="card p-3 sm:p-4 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SPK, customer, JOP, grade..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">{filtered.length} orders</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1120px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left">SPK</th>
              <th className="text-left">JOP</th>
              <th className="text-left">PO</th>
              <th className="text-left">Customer</th>
              <th className="text-left">Grade</th>
              <th className="text-center" style={{ textAlign: 'center' }}>GSM</th>
              <th className="text-center" style={{ textAlign: 'center' }}>RW (mm)</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Qty Roll</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Weight (kg)</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Container</th>
              <th className="text-center" style={{ textAlign: 'center' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.spk}>
                <td className="text-left font-bold text-blue-700 font-mono text-xs">{r.spk}</td>
                <td className="text-left font-mono text-xs">{r.jop}</td>
                <td className="text-left font-mono text-xs">{r.po}</td>
                <td className="text-left font-medium text-slate-900">{r.customer}</td>
                <td className="text-left">{r.grade}</td>
                <td className="text-center">{r.gsm}</td>
                <td className="text-center">{r.rw.toLocaleString()}</td>
                <td className="text-center font-bold">{r.qtyRoll}</td>
                <td className="text-center font-mono text-xs">{r.weight.toLocaleString()}</td>
                <td className="text-center">{r.container}</td>
                <td className={`text-center text-xs ${r.noted ? 'text-slate-700' : 'text-slate-400'}`}>{r.noted || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

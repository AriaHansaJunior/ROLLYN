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

      <div className="card p-3 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full min-w-0">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SPK, customer, JOP, grade..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500">Total: {filtered.length} orders</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1300px] lg:min-w-[1040px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[140px] lg:w-[110px]" />
            <col className="w-[120px] lg:w-[100px]" />
            <col className="w-[120px] lg:w-[100px]" />
            <col className="w-[200px] lg:w-[160px]" />
            <col className="w-[110px] lg:w-[90px]" />
            <col className="w-[80px] lg:w-[60px]" />
            <col className="w-[90px] lg:w-[70px]" />
            <col className="w-[90px] lg:w-[70px]" />
            <col className="w-[100px] lg:w-[80px]" />
            <col className="w-[100px] lg:w-[80px]" />
            <col className="w-[150px] lg:w-[120px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>SPK</th>
              <th style={{ textAlign: 'center' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>PO</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>GSM</th>
              <th style={{ textAlign: 'center' }}>RW (mm)</th>
              <th style={{ textAlign: 'center' }}>Qty Roll</th>
              <th style={{ textAlign: 'center' }}>Weight (kg)</th>
              <th style={{ textAlign: 'center' }}>Container</th>
              <th style={{ textAlign: 'center' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.spk}>
                <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.spk}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{r.jop}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{r.po}</td>
                <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{r.customer}</td>
                <td style={{ textAlign: 'center' }}>{r.grade}</td>
                <td style={{ textAlign: 'center' }}>{r.gsm}</td>
                <td style={{ textAlign: 'center' }}>{r.rw.toLocaleString()}</td>
                <td className="font-bold" style={{ textAlign: 'center' }}>{r.qtyRoll}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{r.weight.toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>{r.container}</td>
                <td className={`text-xs ${r.noted ? 'text-slate-700' : 'text-slate-400'}`} style={{ textAlign: 'center' }}>{r.noted || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

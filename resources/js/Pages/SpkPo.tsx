import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { usePage } from '@inertiajs/react'

export default function SpkPo() {
  const { spkPoData = [] } = usePage<any>().props;
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const processedOrders = spkPoData.map((o: any) => {
    const relatedRolls = o.rolls ? o.rolls.length : 0
    const target = o.quantity || 1
    const status = relatedRolls >= target ? 'Complete' : relatedRolls > 0 ? 'In Progress' : 'Pending'
    const sc = status === 'Complete'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'In Progress'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
      
    return { 
      id: o.id,
      spk: o.spk || '-',
      jop: o.jop || '-',
      po: o.po || '-',
      customer: o.customer?.customer || '-',
      grade: o.grade?.grade || '-',
      qtyRoll: target,
      relatedRolls, 
      status, 
      sc 
    }
  })

  const filtered = processedOrders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      o.spk.toLowerCase().includes(q) ||
      o.jop.toLowerCase().includes(q) ||
      o.po.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.grade.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">SPK / Purchase Order</h2>
        <p className="text-xs text-slate-500 mt-0.5">Production fulfillment correlation between SPK instructions and Customer POs</p>
      </div>

      <div className="card p-3 sm:p-4 grid grid-cols-1 min-[760px]:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full min-[760px]:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SPK, JOP, PO, customer, grade..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
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
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filtered.length} records</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1150px] lg:min-w-[1000px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[140px] lg:w-[120px]" />
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[200px]" />
            <col className="w-[120px] lg:w-[100px]" />
            <col className="w-[130px] lg:w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[150px] lg:w-[140px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>SPK No.</th>
              <th style={{ textAlign: 'center' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>PO No.</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>Target (rolls)</th>
              <th style={{ textAlign: 'center' }}>Fulfilled Rolls</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((o: any) => (
              <tr key={o.id || o.spk} className="hover:bg-slate-50 transition-colors">
                <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{o.spk}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{o.jop}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{o.po}</td>
                <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{o.customer}</td>
                <td style={{ textAlign: 'center' }}>{o.grade}</td>
                <td className="font-semibold" style={{ textAlign: 'center' }}>{o.qtyRoll}</td>
                <td className="font-bold text-slate-900" style={{ textAlign: 'center' }}>{o.relatedRolls}</td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex w-full justify-center">
                    <span className={`badge inline-flex min-w-[96px] justify-center ${o.sc}`}>{o.status}</span>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No SPK/PO records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

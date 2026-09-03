import { useState } from 'react'
import { Search } from 'lucide-react'
import { usePage } from '@inertiajs/react'

export default function TargetOrder() {
  const { targetOrders = [] } = usePage<any>().props;
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  
  const filtered = targetOrders.filter(r => {
    const q = search.toLowerCase()
    const spk = r.spk?.toLowerCase() || ''
    const customer = (r.customer?.customer || '').toLowerCase()
    const jop = r.jop?.toLowerCase() || ''
    const grade = (r.grade?.grade || '').toLowerCase()
    return !q || spk.includes(q) || customer.includes(q) || jop.includes(q) || grade.includes(q)
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Target Order</h2>
        <p className="text-xs text-slate-500 mt-0.5">Production fulfillment targets and container assignment schedule</p>
      </div>

      <div className="card p-3 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search SPK, customer, JOP, grade..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div>
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filtered.length} orders</span>
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
            <col className="w-[100px] lg:w-[80px]" />
            <col className="w-[100px] lg:w-[80px]" />
            <col className="w-[80px] lg:w-[70px]" />
            <col className="w-[120px] lg:w-[100px]" />
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
              <th style={{ textAlign: 'center' }}>Target (kg)</th>
              <th style={{ textAlign: 'center' }}>TPH</th>
              <th style={{ textAlign: 'center' }}>Est. Finish</th>
              <th style={{ textAlign: 'center' }}>Container</th>
              <th style={{ textAlign: 'center' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((r: any) => (
              <tr key={r.id || r.spk} className="hover:bg-slate-50 transition-colors">
                <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.spk || '-'}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{r.jop}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{r.po || '-'}</td>
                <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{r.customer?.customer || '-'}</td>
                <td style={{ textAlign: 'center' }}>{r.grade?.grade || '-'}</td>
                <td style={{ textAlign: 'center' }}>{r.gsm?.gsm || '-'}</td>
                <td style={{ textAlign: 'center' }}>{r.rolls_width?.width || r.rollsWidth?.width || '-'}</td>
                <td className="font-bold" style={{ textAlign: 'center' }}>{r.quantity || 0}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{(r.weight || 0).toLocaleString('id-ID')}</td>
                <td style={{ textAlign: 'center' }}>{r.production_estimation?.tph ?? '-'}</td>
                <td className="font-mono text-xs" style={{ textAlign: 'center' }}>{r.production_estimation?.estimated_finish_time ?? 'N/A'}</td>
                <td style={{ textAlign: 'center' }}>{r.container || '-'}</td>
                <td className={`text-xs ${r.noted_order ? 'text-slate-700' : 'text-slate-400 italic'}`} style={{ textAlign: 'center' }}>{r.noted_order || 'No notes'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-slate-500">
                  No target orders found in the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-xs text-slate-500">Rows per page:</span>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="text-xs border-slate-200 rounded-md py-1 px-2 pr-7 text-slate-600 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {[5, 10, 25, 50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'} min-w-[30px] justify-center`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}

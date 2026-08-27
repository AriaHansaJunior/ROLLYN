import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { usePage } from '@inertiajs/react'

const statusBadge: Record<string, { bg: string; color: string }> = {
  'Success': { bg: '#d4edda', color: '#3C763D' },
  'Error': { bg: '#fde8e8', color: '#C0392B' },
}

export default function OcrMonitoring() {
  const { ocrLogs = [] } = usePage<any>().props;
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const filtered = ocrLogs.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.roll.toLowerCase().includes(q) || r.admin.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">OCR Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">Real-time log of camera scale weight recognition events</p>
      </div>

      <div className="card p-3 sm:p-4 grid grid-cols-1 min-[760px]:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full min-[760px]:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search roll, admin, ID..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 justify-between w-full min-[760px]:w-auto min-[760px]:justify-end">
          <div className="flex items-center gap-1.5 min-w-0">
            <Filter size={13} className="text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-input text-xs py-1.5 min-w-[130px] w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Error">Error</option>
            </select>
          </div>
        </div>
        <div className="min-[760px]:col-span-2 mt-1 min-[760px]:mt-0">
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filtered.length} records</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1100px] lg:min-w-[850px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[110px] lg:w-[80px]" />
            <col className="w-[170px] lg:w-[130px]" />
            <col className="w-[110px] lg:w-[80px]" />
            <col className="w-[150px] lg:w-[110px]" />
            <col className="w-[120px] lg:w-[90px]" />
            <col className="w-[170px] lg:w-[130px]" />
            <col className="w-[150px] lg:w-[120px]" />
            <col className="w-[120px] lg:w-[110px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'center' }}>Timestamp</th>
              <th style={{ textAlign: 'center' }}>Roll</th>
              <th style={{ textAlign: 'center' }}>Detected Weight</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'left' }}>Error Reason</th>
              <th style={{ textAlign: 'center' }}>Administrator</th>
              <th style={{ textAlign: 'center' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map(r => {
              const sc = statusBadge[r.status] || { bg: '#EEEEEE', color: '#333' }
              return (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-bold text-slate-700" style={{ textAlign: 'left' }}>{r.id}</td>
                  <td className="text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.timestamp}</td>
                  <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'center' }}>{r.roll}</td>
                  <td className="font-mono text-xs font-bold text-slate-900" style={{ textAlign: 'center' }}>{r.detectedWeight}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      <span className="badge inline-flex min-w-[82px] justify-center" style={{ backgroundColor: sc.bg, color: sc.color }}>{r.status}</span>
                    </div>
                  </td>
                  <td className={`text-xs ${r.error === '-' ? 'text-slate-400' : 'text-red-600 font-semibold'}`} style={{ textAlign: 'left' }}>{r.error}</td>
                  <td className="text-xs text-slate-700" style={{ textAlign: 'center' }}>{r.admin}</td>
                  <td className="text-xs text-slate-700" style={{ textAlign: 'center' }}>{r.result}</td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No OCR records found.
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

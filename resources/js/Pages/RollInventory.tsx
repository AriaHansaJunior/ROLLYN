import { useState } from 'react'
import { Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Download } from 'lucide-react'
import { rollInventory } from '../data/dummy'
import { router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

const statusColors: Record<string, { bg: string; color: string }> = {
  'Slotted': { bg: '#d0e8f5', color: '#286090' },
  'Shipment Plan': { bg: '#d4edda', color: '#3C763D' },
  'Hold': { bg: '#cce5ff', color: '#004085' },
  'Non-PO': { bg: '#fde8e8', color: '#C0392B' },
  'Incoming': { bg: '#fff3cd', color: '#8A6D3B' },
}

const PER_PAGE = 8

export default function RollInventory() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortKey, setSortKey] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const statuses = ['All', ...Array.from(new Set(rollInventory.map(r => r.status)))]

  const filtered = rollInventory.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.id.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey]
    const vb = (b as Record<string, unknown>)[sortKey]
    if (va === undefined || vb === undefined) return 0
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function sort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ k }: { k: string }) {
    if (sortKey !== k) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  function handleExport() {
    SystemUI.toast({ message: 'Roll inventory exported successfully.', type: 'success' })
  }

  const cols: { key: string; label: string }[] = [
    { key: 'id', label: 'Roll No.' },
    { key: 'form', label: 'Form No.' },
    { key: 'shift', label: 'Shift' },
    { key: 'date', label: 'Entry Date' },
    { key: 'grade', label: 'Grade' },
    { key: 'gsm', label: 'GSM' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'width', label: 'Width (mm)' },
    { key: 'location', label: 'Location' },
    { key: 'jop', label: 'JOP' },
    { key: 'pic', label: 'PIC' },
    { key: 'status', label: 'Status' },
  ]
  const centeredCols = new Set(['shift', 'date', 'gsm', 'weight', 'width', 'location', 'jop', 'pic', 'status'])

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Roll Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive catalog of physical rolls across all warehouses</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 grid grid-cols-1 min-[760px]:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search roll, grade, JOP, location..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-1.5 min-[760px]:justify-end">
          <Filter size={13} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="form-input text-xs py-1.5 w-full min-[760px]:w-auto"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>
        <div className="min-[760px]:col-span-2">
          <span className="text-xs font-semibold text-slate-500">Total: {filtered.length} rolls</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1180px] table-fixed border-collapse text-xs">
          <thead>
            <tr>
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => sort(col.key)}
                  className={`cursor-pointer select-none ${centeredCols.has(col.key) ? 'text-center' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${centeredCols.has(col.key) ? 'justify-center' : ''}`}>
                    {col.label} <SortIcon k={col.key} />
                  </div>
                </th>
              ))}
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="text-center py-8 text-slate-400">No rolls found.</td></tr>
            ) : paged.map(r => {
              const sc = statusColors[r.status] || { bg: '#EEEEEE', color: '#333' }
              return (
                <tr key={r.id}>
                  <td><span className="font-bold text-blue-700 font-mono text-xs">{r.id}</span></td>
                  <td className="font-mono text-xs">{r.form}</td>
                  <td className="text-center"><span className="badge bg-slate-100 text-slate-700 border-slate-200">{r.shift}</span></td>
                  <td className="text-center text-xs">{r.date}</td>
                  <td><span className="font-semibold text-slate-800">{r.grade}</span></td>
                  <td className="text-center">{r.gsm}</td>
                  <td className="text-center font-mono text-xs">{r.weight.toLocaleString()}</td>
                  <td className="text-center">{r.width}</td>
                  <td className="text-center font-mono text-xs">{r.location || <span className="text-red-600">No Slot</span>}</td>
                  <td className="text-center text-xs">{r.jop}</td>
                  <td className="text-center text-xs">{r.pic}</td>
                  <td className="text-center">
                    <div className="flex w-full justify-center">
                      <span className="badge inline-flex min-w-[88px] justify-center" style={{ backgroundColor: sc.bg, color: sc.color }}>{r.status}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex w-full justify-center">
                      <button className="btn btn-secondary btn-sm p-1.5 cursor-pointer" onClick={() => router.visit('/roll-detail')} title="View Roll Detail">
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
        <span className="text-xs text-slate-500">
          Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
        </span>
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

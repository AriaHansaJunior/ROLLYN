import { useState } from 'react'
import { Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Download } from 'lucide-react'
import { rollInventory } from '../data/dummy'
import { router } from '@inertiajs/react'

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
  const [gradeFilter, setGradeFilter] = useState('All')
  const [sortKey, setSortKey] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const statuses = ['All', ...Array.from(new Set(rollInventory.map(r => r.status)))]
  const grades = ['All', ...Array.from(new Set(rollInventory.map(r => r.grade)))]

  const filtered = rollInventory.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.id.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    const matchGrade = gradeFilter === 'All' || r.grade === gradeFilter
    return matchSearch && matchStatus && matchGrade
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

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="page-title">Roll Inventory</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={13} /> Export</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', border: '1px solid #DDDDDD', borderRadius: 4, padding: '6px 10px', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{ color: '#999', flexShrink: 0 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search roll, grade, JOP, location..." className="form-input" style={{ padding: 0, border: 'none', background: 'none', boxShadow: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} style={{ color: '#777' }} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input" style={{ width: 'auto', paddingRight: 28 }}>
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1) }} className="form-input" style={{ width: 'auto', paddingRight: 28 }}>
          {grades.map(g => <option key={g}>{g}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#777', marginLeft: 'auto' }}>{filtered.length} rolls</span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              {cols.map(col => (
                <th key={col.key} onClick={() => sort(col.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.label} <SortIcon k={col.key} />
                  </div>
                </th>
              ))}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={cols.length + 1} style={{ textAlign: 'center', padding: 32, color: '#999' }}>No rolls found.</td></tr>
            ) : paged.map(r => {
              const sc = statusColors[r.status] || { bg: '#EEEEEE', color: '#333' }
              return (
                <tr key={r.id}>
                  <td><span style={{ fontWeight: 700, color: '#286090', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.id}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.form}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: '#F5F5F5', color: '#333', border: '1px solid #DDD' }}>{r.shift}</span></td>
                  <td style={{ fontSize: 12 }}>{r.date}</td>
                  <td><span style={{ fontWeight: 600 }}>{r.grade}</span></td>
                  <td style={{ textAlign: 'right' }}>{r.gsm}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.weight.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{r.width}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.location || <span style={{ color: '#C0392B' }}>No Slot</span>}</td>
                  <td style={{ fontSize: 12 }}>{r.jop}</td>
                  <td style={{ fontSize: 12 }}>{r.pic}</td>
                  <td><span className="badge" style={{ background: sc.bg, color: sc.color }}>{r.status}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => router.visit('/roll-detail')} style={{ padding: '3px 8px' }}>
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 }}>
        <span style={{ fontSize: 12, color: '#777' }}>
          Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>{p}</button>
          ))}
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}

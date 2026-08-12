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
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>OCR Monitoring</h2>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', border: '1px solid #DDDDDD', borderRadius: 4, padding: '6px 10px', flex: '1 1 200px' }}>
          <Search size={14} style={{ color: '#999' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roll, admin, ID..." className="form-input" style={{ padding: 0, border: 'none', background: 'none', boxShadow: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} style={{ color: '#777' }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ width: 'auto' }}>
            <option>All</option><option>Success</option><option>Error</option>
          </select>
        </div>
        <span style={{ fontSize: 12, color: '#777', marginLeft: 'auto' }}>{filtered.length} records</span>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Roll</th>
              <th>Detected Weight</th>
              <th>Status</th>
              <th>Error Reason</th>
              <th>Administrator</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const sc = statusBadge[r.status] || { bg: '#EEEEEE', color: '#333' }
              return (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.id}</td>
                  <td style={{ fontSize: 12 }}>{r.timestamp}</td>
                  <td style={{ fontWeight: 600, color: '#286090', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.roll}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{r.detectedWeight}</td>
                  <td><span className="badge" style={{ background: sc.bg, color: sc.color }}>{r.status}</span></td>
                  <td style={{ color: r.error === '-' ? '#999' : '#C0392B', fontSize: 12 }}>{r.error}</td>
                  <td style={{ fontSize: 12 }}>{r.admin}</td>
                  <td style={{ fontSize: 12 }}>{r.result}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

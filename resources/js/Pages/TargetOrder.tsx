import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { targetOrders } from '../data/dummy'

export default function TargetOrder() {
  const [search, setSearch] = useState('')
  const filtered = targetOrders.filter(r => {
    const q = search.toLowerCase()
    return !q || r.spk.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>Target Order</h2>
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', border: '1px solid #DDDDDD', borderRadius: 4, padding: '6px 10px', flex: '1 1 200px' }}>
          <Search size={14} style={{ color: '#999' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SPK, customer, JOP, grade..." className="form-input" style={{ padding: 0, border: 'none', background: 'none', boxShadow: 'none' }} />
        </div>
        <span style={{ fontSize: 12, color: '#777', marginLeft: 'auto' }}>{filtered.length} orders</span>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>SPK</th><th>JOP</th><th>PO</th><th>Customer</th><th>Grade</th>
              <th>GSM</th><th>RW (mm)</th><th>Qty Roll</th><th>Weight (kg)</th><th>Container</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.spk}>
                <td style={{ fontWeight: 700, color: '#286090', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.spk}</td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.jop}</td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.po}</td>
                <td style={{ fontWeight: 500 }}>{r.customer}</td>
                <td>{r.grade}</td>
                <td style={{ textAlign: 'right' }}>{r.gsm}</td>
                <td style={{ textAlign: 'right' }}>{r.rw.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.qtyRoll}</td>
                <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.weight.toLocaleString()}</td>
                <td>{r.container}</td>
                <td style={{ fontSize: 12, color: r.noted ? '#333' : '#999' }}>{r.noted || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

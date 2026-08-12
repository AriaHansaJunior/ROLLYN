import { warehouseData } from '../data/dummy'

const statusDef = [
  { key: 'available', label: 'Free Space', bg: '#FFFFFF', border: '#DDDDDD', color: '#333' },
  { key: 'planning', label: 'Slot Planning', bg: '#CCCCCC', border: '#AAAAAA', color: '#333' },
  { key: 'occupied', label: 'Slotted', bg: '#9ecae1', border: '#5b9fcf', color: '#1a4e70' },
  { key: 'shipment', label: 'Shipment Plan', bg: '#5CB85C', border: '#3C763D', color: '#fff' },
  { key: 'nonPO', label: 'Non-PO', bg: '#e74c3c', border: '#c0392b', color: '#fff' },
  { key: 'moveWH', label: 'Move Warehouse', bg: '#f39c12', border: '#d68910', color: '#fff' },
  { key: 'hold', label: 'Hold', bg: '#337AB7', border: '#286090', color: '#fff' },
]

export default function SlotStatus() {
  const totals = warehouseData.reduce((acc, wh) => {
    statusDef.forEach(s => {
      acc[s.key] = (acc[s.key] || 0) + ((wh as unknown as Record<string, number>)[s.key] || 0)
    })
    return acc
  }, {} as Record<string, number>)

  const totalSlots = warehouseData.reduce((s, w) => s + w.total, 0)

  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>Slot Status</h2>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        {statusDef.map(s => (
          <div key={s.key} style={{ background: '#fff', border: `2px solid ${s.border}`, borderRadius: 4, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 2, background: s.bg, border: `1px solid ${s.border}` }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.border }}>{totals[s.key] || 0}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
              {totalSlots > 0 ? Math.round(((totals[s.key] || 0) / totalSlots) * 100) : 0}% of total
            </div>
          </div>
        ))}
      </div>

      {/* Per-warehouse breakdown */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="section-title">Per-Warehouse Slot Distribution</h3>
        </div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Warehouse</th>
              {statusDef.map(s => <th key={s.key}>{s.label}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {warehouseData.map(wh => (
              <tr key={wh.id}>
                <td style={{ fontWeight: 700, color: '#286090' }}>WH {wh.id}</td>
                {statusDef.map(s => {
                  const val = (wh as unknown as Record<string, number>)[s.key] || 0
                  return (
                    <td key={s.key} style={{ textAlign: 'right' }}>
                      {val > 0 ? <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{val}</span> : <span style={{ color: '#CCC' }}>0</span>}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{wh.total}</td>
              </tr>
            ))}
            <tr style={{ background: '#F5F5F5', fontWeight: 700 }}>
              <td>Total</td>
              {statusDef.map(s => <td key={s.key} style={{ textAlign: 'right', fontWeight: 700 }}>{totals[s.key] || 0}</td>)}
              <td style={{ textAlign: 'right' }}>{totalSlots}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

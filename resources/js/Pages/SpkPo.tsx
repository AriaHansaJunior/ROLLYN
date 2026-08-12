import { targetOrders, rollInventory } from '../data/dummy'

export default function SpkPo() {
  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>SPK / Purchase Order</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>SPK No.</th><th>JOP</th><th>PO No.</th><th>Customer</th>
              <th>Grade</th><th>Target (rolls)</th><th>Related Rolls</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {targetOrders.map(o => {
              const relatedRolls = rollInventory.filter(r => r.jop === o.jop).length
              const status = relatedRolls >= o.qtyRoll ? 'Complete' : relatedRolls > 0 ? 'In Progress' : 'Pending'
              const sc = status === 'Complete' ? { bg: '#d4edda', color: '#3C763D' } : status === 'In Progress' ? { bg: '#d0e8f5', color: '#286090' } : { bg: '#fff3cd', color: '#8A6D3B' }
              return (
                <tr key={o.spk}>
                  <td style={{ fontWeight: 700, color: '#286090', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{o.spk}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{o.jop}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{o.po}</td>
                  <td style={{ fontWeight: 500 }}>{o.customer}</td>
                  <td>{o.grade}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.qtyRoll}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{relatedRolls}</td>
                  <td><span className="badge" style={{ background: sc.bg, color: sc.color }}>{status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

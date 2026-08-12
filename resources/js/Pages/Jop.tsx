import { jopData } from '../data/dummy'

export default function Jop() {
  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>JOP — Job Order Production</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>JOP</th><th>SPK</th><th>PO</th><th>Customer</th><th>Grade</th>
              <th>Target Rolls</th><th>Completed Rolls</th><th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {jopData.map(r => {
              const pct = r.progress
              const color = pct >= 100 ? '#5CB85C' : pct >= 60 ? '#337AB7' : '#8A6D3B'
              return (
                <tr key={r.jop}>
                  <td style={{ fontWeight: 700, color: '#286090', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.jop}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.spk}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.po}</td>
                  <td style={{ fontWeight: 500 }}>{r.customer}</td>
                  <td>{r.grade}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.target}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.rolls}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: '#EEEEEE', borderRadius: 4, minWidth: 80 }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color, width: 36 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

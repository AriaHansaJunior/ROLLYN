import { AlertTriangle, CheckCircle, Info, XCircle, TrendingUp, Package, Weight, Boxes, BarChart2, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { demandForecast, warehouseData, alerts } from '../data/dummy'
import { router } from '@inertiajs/react'

const kpis = [
  { label: 'Total Rolls', value: '1,248', sub: '+12 today', color: '#286090', icon: Package },
  { label: 'Total Weight (ton)', value: '1,253.4', sub: 'in warehouse', color: '#286090', icon: Weight },
  { label: 'Received Today', value: '24', sub: 'rolls', color: '#5CB85C', icon: Boxes },
  { label: 'Needs Verification', value: '3', sub: 'pending', color: '#8A6D3B', icon: AlertTriangle },
  { label: 'Occupied Slots', value: '260', sub: 'of 420 total', color: '#286090', icon: BarChart2 },
  { label: 'Available Slots', value: '160', sub: 'across all WH', color: '#5CB85C', icon: Boxes },
  { label: 'Shipment Plan', value: '62', sub: 'rolls', color: '#337AB7', icon: Package },
  { label: 'Hold', value: '15', sub: 'rolls', color: '#31708F', icon: Package },
  { label: 'Non-PO', value: '18', sub: 'rolls', color: '#C0392B', icon: Package },
  { label: 'Move Warehouse', value: '9', sub: 'rolls', color: '#8A6D3B', icon: Package },
]

function AlertIcon({ type }: { type: string }) {
  if (type === 'error') return <XCircle size={16} style={{ color: '#C0392B', flexShrink: 0 }} />
  if (type === 'warning') return <AlertTriangle size={16} style={{ color: '#8A6D3B', flexShrink: 0 }} />
  if (type === 'info') return <Info size={16} style={{ color: '#31708F', flexShrink: 0 }} />
  return <CheckCircle size={16} style={{ color: '#5CB85C', flexShrink: 0 }} />
}

const alertBg: Record<string, string> = {
  error: '#fdf2f2',
  warning: '#fdf8f0',
  info: '#f0f6fb',
  success: '#f2f9f2',
}
const alertBorder: Record<string, string> = {
  error: '#C0392B',
  warning: '#8A6D3B',
  info: '#31708F',
  success: '#5CB85C',
}

export default function Dashboard() {
  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Row */}
      <div>
        <h2 className="page-title" style={{ marginBottom: 14 }}>Operations Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {kpis.map(kpi => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#777', fontWeight: 500, marginBottom: 4 }}>{kpi.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{kpi.sub}</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: 4, background: kpi.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} style={{ color: kpi.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main row: WH Overview + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }} className="max-[1179px]:grid-cols-1!">
        {/* Warehouse overview */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="section-title">Warehouse Condition</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => router.visit('/warehouse-map')}>
              View Map <ArrowUpRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>WH</th>
                  <th>Occupied</th>
                  <th>Available</th>
                  <th>Utilization</th>
                  <th>Shipment</th>
                  <th>Non-PO</th>
                  <th>Move WH</th>
                  <th>Hold</th>
                </tr>
              </thead>
              <tbody>
                {warehouseData.map(wh => {
                  const util = Math.round((wh.occupied / wh.total) * 100)
                  return (
                    <tr key={wh.id}>
                      <td><span style={{ fontWeight: 700, color: '#286090' }}>WH {wh.id}</span></td>
                      <td>{wh.occupied}</td>
                      <td>{wh.available}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#EEEEEE', borderRadius: 3, minWidth: 60 }}>
                            <div style={{ width: `${util}%`, height: '100%', background: util > 85 ? '#C0392B' : util > 60 ? '#8A6D3B' : '#5CB85C', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', width: 34 }}>{util}%</span>
                        </div>
                      </td>
                      <td><span className="badge" style={{ background: '#d4edda', color: '#3C763D' }}>{wh.shipment}</span></td>
                      <td><span className="badge" style={{ background: '#fde8e8', color: '#C0392B' }}>{wh.nonPO}</span></td>
                      <td><span className="badge" style={{ background: '#fff3cd', color: '#8A6D3B' }}>{wh.moveWH}</span></td>
                      <td><span className="badge" style={{ background: '#d0e8f5', color: '#286090' }}>{wh.hold}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Operational Alerts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320 }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{ background: alertBg[alert.type], borderLeft: `3px solid ${alertBorder[alert.type]}`, borderRadius: '0 4px 4px 0', padding: '8px 10px', display: 'flex', gap: 8 }}>
                <AlertIcon type={alert.type} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#333' }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{alert.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }} className="max-[1179px]:grid-cols-1!">
        {/* Demand Forecast */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 className="section-title">Demand Forecast</h3>
              <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>Historical + AI-projected demand (rolls/month)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f7ff', border: '1px solid #c5dff5', borderRadius: 4, padding: '4px 10px' }}>
              <TrendingUp size={14} style={{ color: '#286090' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#286090' }}>AI Forecast Active</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={demandForecast} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#777' }} />
              <YAxis tick={{ fontSize: 11, fill: '#777' }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #DDDDDD' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" stroke="#337AB7" strokeWidth={2} dot={{ r: 3 }} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#5CB85C" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="Forecast (AI)" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insight */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 4, background: '#286090', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 className="section-title" style={{ marginBottom: 0 }}>AI Insight</h3>
              <div style={{ fontSize: 11, color: '#777' }}>Generated from warehouse data</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📈', text: 'Demand is trending upward over the current period. An average 8.2% month-over-month increase has been observed since Q1.' },
              { icon: '👥', text: 'Customer order activity is increasing compared with the same period last year. Three key accounts are driving higher volume.' },
              { icon: '⚠️', text: 'Inventory pressure may increase over the next 60 days if current demand continues. Consider reviewing slot capacity for WH-C.' },
              { icon: '📦', text: 'Peak demand is projected in December 2024. Production planning should account for a 22% volume increase vs current capacity.' },
            ].map((insight, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px', background: '#F5F5F5', borderRadius: 4 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{insight.icon}</span>
                <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5, margin: 0 }}>{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warehouse utilization bar chart */}
      <div className="card" style={{ padding: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Warehouse Slot Distribution</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={warehouseData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
            <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#777' }} tickFormatter={v => `WH ${v}`} />
            <YAxis tick={{ fontSize: 11, fill: '#777' }} />
            <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #DDDDDD' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="occupied" stackId="a" fill="#286090" name="Occupied" />
            <Bar dataKey="available" stackId="a" fill="#EEEEEE" name="Available" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

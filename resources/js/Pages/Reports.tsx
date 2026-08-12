import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { warehouseData, demandForecast } from '../data/dummy'

const statusDistribution = [
  { name: 'Slotted', value: 260, color: '#9ecae1' },
  { name: 'Shipment Plan', value: 62, color: '#5CB85C' },
  { name: 'Hold', value: 15, color: '#337AB7' },
  { name: 'Non-PO', value: 18, color: '#e74c3c' },
  { name: 'Move WH', value: 9, color: '#f39c12' },
  { name: 'Free Space', value: 160, color: '#EEEEEE' },
]

const ocrActivity = [
  { day: 'Mon', success: 18, error: 2 },
  { day: 'Tue', success: 22, error: 1 },
  { day: 'Wed', success: 15, error: 3 },
  { day: 'Thu', success: 24, error: 0 },
  { day: 'Fri', success: 20, error: 2 },
  { day: 'Sat', success: 12, error: 1 },
  { day: 'Sun', success: 8, error: 0 },
]

const kpis = [
  { label: 'Total Rolls This Week', value: '119' },
  { label: 'Total Weight Received (ton)', value: '119.8' },
  { label: 'Order Completion Rate', value: '62%' },
  { label: 'OCR Success Rate', value: '91.7%' },
  { label: 'Avg Weight per Roll (kg)', value: '1,006' },
  { label: 'Warehouse Utilization', value: '61.9%' },
]

export default function Reports() {
  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 className="page-title">Reports</h2>

      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div style={{ fontSize: 11, color: '#777', fontWeight: 500, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#286090' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="max-[679px]:grid-cols-1!">
        {/* WH Occupancy */}
        <div className="card" style={{ padding: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Warehouse Occupancy (Slots)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={warehouseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis dataKey="id" tick={{ fontSize: 11 }} tickFormatter={v => `WH ${v}`} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #DDDDDD' }} />
              <Bar dataKey="occupied" fill="#286090" name="Occupied" />
              <Bar dataKey="available" fill="#EEEEEE" name="Available" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="card" style={{ padding: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Roll Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={false} labelLine={false} fontSize={10}>
                {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} stroke={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* OCR Activity */}
        <div className="card" style={{ padding: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>OCR Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ocrActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #DDDDDD' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="success" fill="#5CB85C" name="Success" />
              <Bar dataKey="error" fill="#e74c3c" name="Error" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Demand trend */}
        <div className="card" style={{ padding: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Demand Trend & Forecast</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={demandForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #DDDDDD' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" stroke="#337AB7" strokeWidth={2} name="Actual" dot={{ r: 2 }} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#5CB85C" strokeWidth={2} strokeDasharray="5 3" name="Forecast" dot={{ r: 2 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { warehouseData, demandForecast } from '../data/dummy'

const statusDistribution = [
  { name: 'Slotted', value: 260, color: '#9ecae1' },
  { name: 'Shipment Plan', value: 62, color: '#5CB85C' },
  { name: 'Hold', value: 15, color: '#337AB7' },
  { name: 'Non-PO', value: 18, color: '#e74c3c' },
  { name: 'Move WH', value: 9, color: '#f39c12' },
  { name: 'Free Space', value: 160, color: '#CBD5E1' },
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
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Historical operational summary, OCR performance, and warehouse utilization</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 min-[680px]:grid-cols-3 min-[1180px]:grid-cols-6 gap-2.5">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 truncate mb-1">{kpi.label}</div>
            <div className="text-xl font-extrabold text-blue-900 font-mono leading-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 min-[680px]:grid-cols-2 gap-4">
        {/* WH Occupancy */}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Warehouse Occupancy (Slots)</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `WH ${v}`} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="occupied" fill="#2563EB" name="Occupied" radius={[0, 0, 4, 4]} />
                <Bar dataKey="available" fill="#E2E8F0" name="Available" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status distribution */}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Roll Status Distribution</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={false} labelLine={false}>
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} stroke={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OCR Activity */}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">OCR Recognition Activity (Last 7 Days)</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocrActivity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="success" fill="#16A34A" name="Success" radius={[4, 4, 0, 0]} />
                <Bar dataKey="error" fill="#DC2626" name="Error" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demand trend */}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Demand Trend & Forecast</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandForecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} name="Actual" dot={{ r: 2 }} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#16A34A" strokeWidth={2.5} strokeDasharray="5 3" name="Forecast (AI)" dot={{ r: 2 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

import { AlertTriangle, CheckCircle, Info, XCircle, TrendingUp, Package, Weight, Boxes, BarChart2, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { demandForecast, warehouseData, alerts } from '../data/dummy'
import { router } from '@inertiajs/react'

const kpis = [
  { label: 'Total Rolls', value: '1,248', sub: '+12 today', color: '#2563EB', bg: 'bg-blue-50', text: 'text-blue-700', icon: Package },
  { label: 'Total Weight (ton)', value: '1,253.4', sub: 'in warehouse', color: '#0284C7', bg: 'bg-sky-50', text: 'text-sky-700', icon: Weight },
  { label: 'Received Today', value: '24', sub: 'rolls', color: '#16A34A', bg: 'bg-green-50', text: 'text-green-700', icon: Boxes },
  { label: 'Needs Verification', value: '3', sub: 'pending', color: '#D97706', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
  { label: 'Occupied Slots', value: '260', sub: 'of 420 total', color: '#4F46E5', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: BarChart2 },
  { label: 'Available Slots', value: '160', sub: 'across all WH', color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Boxes },
  { label: 'Shipment Plan', value: '62', sub: 'rolls', color: '#2563EB', bg: 'bg-blue-50', text: 'text-blue-700', icon: Package },
  { label: 'Hold', value: '15', sub: 'rolls', color: '#1D4ED8', bg: 'bg-blue-50', text: 'text-blue-800', icon: Package },
  { label: 'Non-PO', value: '18', sub: 'rolls', color: '#DC2626', bg: 'bg-red-50', text: 'text-red-700', icon: Package },
  { label: 'Move Warehouse', value: '9', sub: 'rolls', color: '#D97706', bg: 'bg-amber-50', text: 'text-amber-800', icon: Package },
]

function AlertIcon({ type }: { type: string }) {
  if (type === 'error') return <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
  if (type === 'warning') return <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
  if (type === 'info') return <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
  return <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
}

const alertBg: Record<string, string> = {
  error: 'bg-red-50/60 border-red-500',
  warning: 'bg-amber-50/60 border-amber-500',
  info: 'bg-blue-50/60 border-blue-500',
  success: 'bg-green-50/60 border-green-500',
}

export default function Dashboard() {
  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-5 max-w-full overflow-x-hidden">
      {/* Header & KPI Section */}
      <div>
        <div className="mb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Operations Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time metrics & operational status</p>
        </div>

        <div className="grid grid-cols-2 min-[680px]:grid-cols-3 min-[920px]:grid-cols-4 min-[1180px]:grid-cols-5 gap-2.5">
          {kpis.map(kpi => {
            const Icon = kpi.icon
            return (
              <div
                key={kpi.label}
                className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{kpi.label}</div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1 leading-none">
                      {kpi.value}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 mt-1 truncate">{kpi.sub}</div>
                  </div>
                  <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={kpi.text} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Grid: Warehouse Condition Table + Operational Alerts */}
      <div className="grid grid-cols-1 min-[1180px]:grid-cols-[1fr_320px] gap-4">
        
        {/* Warehouse Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Warehouse Condition</h3>
              <p className="text-[11px] text-slate-400">Current occupancy & status by warehouse</p>
            </div>
            <button
              onClick={() => router.visit('/warehouse-map')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
            >
              <span>Map</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[580px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3 rounded-l-lg">WH</th>
                  <th className="py-2.5 px-2">Occupied</th>
                  <th className="py-2.5 px-2">Available</th>
                  <th className="py-2.5 px-2 w-36">Utilization</th>
                  <th className="py-2.5 px-2">Shipment</th>
                  <th className="py-2.5 px-2">Non-PO</th>
                  <th className="py-2.5 px-2">Move WH</th>
                  <th className="py-2.5 px-2 rounded-r-lg">Hold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {warehouseData.map(wh => {
                  const util = Math.round((wh.occupied / wh.total) * 100)
                  return (
                    <tr key={wh.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-blue-700">WH {wh.id}</td>
                      <td className="py-2.5 px-2">{wh.occupied}</td>
                      <td className="py-2.5 px-2">{wh.available}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[50px]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                util > 85 ? 'bg-red-500' : util > 60 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${util}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 w-8">{util}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          {wh.shipment}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          {wh.nonPO}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {wh.moveWH}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {wh.hold}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs flex flex-col">
          <div className="pb-2.5 mb-3 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Operational Alerts</h3>
            <p className="text-[11px] text-slate-400">System warnings & required actions</p>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-xl border-l-4 ${alertBg[alert.type]} border border-slate-100 flex items-start gap-2.5`}
              >
                <AlertIcon type={alert.type} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">{alert.title}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{alert.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">{alert.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Row: Demand Forecast & AI Insights */}
      <div className="grid grid-cols-1 min-[1180px]:grid-cols-[1fr_320px] gap-4">
        {/* Demand Forecast Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Demand Forecast</h3>
              <p className="text-[11px] text-slate-400">Historical + AI-projected demand (rolls/month)</p>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 text-[11px] font-semibold">
              <TrendingUp size={13} />
              <span>AI Forecast Active</span>
            </div>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandForecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} name="Actual" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#16A34A" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 3 }} name="Forecast (AI)" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Insights</h3>
              <p className="text-[11px] text-slate-400">Warehouse analytics summary</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { icon: '📈', text: 'Demand is trending upward over the current period. An average 8.2% month-over-month increase has been observed since Q1.' },
              { icon: '👥', text: 'Customer order activity is increasing compared with the same period last year. Three key accounts are driving higher volume.' },
              { icon: '⚠️', text: 'Inventory pressure may increase over the next 60 days if current demand continues. Consider reviewing slot capacity for WH-C.' },
              { icon: '📦', text: 'Peak demand is projected in December. Production planning should account for a 22% volume increase vs current capacity.' },
            ].map((insight, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-sm shrink-0">{insight.icon}</span>
                <p className="text-[11px] text-slate-600 leading-relaxed m-0">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warehouse Slot Distribution Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2">Warehouse Slot Distribution</h3>
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={warehouseData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="id" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `WH ${v}`} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="occupied" stackId="a" fill="#2563EB" name="Occupied" radius={[0, 0, 4, 4]} />
              <Bar dataKey="available" stackId="a" fill="#E2E8F0" name="Available" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

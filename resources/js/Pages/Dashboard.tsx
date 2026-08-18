import { AlertTriangle, CheckCircle, Info, XCircle, TrendingUp, Package, Weight, Boxes, BarChart2, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { usePage, router } from '@inertiajs/react'

interface DashboardProps {
  stats: {
    total_rolls: number;
    total_weight: number;
    received_today: number;
    occupied_slots: number;
    total_slots: number;
    available_slots: number;
    active_jops: number;
  };
  warehouseData: any[];
  alerts: any[];
  demandForecast: any[];
}

export default function Dashboard() {
  const { stats, warehouseData, alerts, demandForecast } = usePage<any>().props as unknown as DashboardProps;

  const kpis = [
    { label: 'Total Rolls', value: stats.total_rolls.toLocaleString(), sub: 'in inventory', color: '#2563EB', bg: 'bg-blue-50', text: 'text-blue-700', icon: Package },
    { label: 'Total Weight (kg)', value: stats.total_weight.toLocaleString(), sub: 'in warehouse', color: '#0284C7', bg: 'bg-sky-50', text: 'text-sky-700', icon: Weight },
    { label: 'Received Today', value: stats.received_today.toString(), sub: 'rolls', color: '#16A34A', bg: 'bg-green-50', text: 'text-green-700', icon: Boxes },
    { label: 'Active JOPs', value: stats.active_jops.toString(), sub: 'jobs', color: '#D97706', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
    { label: 'Occupied Slots', value: stats.occupied_slots.toString(), sub: `of ${stats.total_slots} total`, color: '#4F46E5', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: BarChart2 },
    { label: 'Available Slots', value: stats.available_slots.toString(), sub: 'across all WH', color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Boxes },
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


  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-5 max-w-full overflow-x-hidden">
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

      <div className="grid grid-cols-1 min-[1180px]:grid-cols-[1fr_320px] gap-4">
        
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

          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[750px] table-fixed border-collapse text-xs">
              <colgroup>
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[140px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[80px]" />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>WH</th>
                  <th style={{ textAlign: 'center' }}>Occupied</th>
                  <th style={{ textAlign: 'center' }}>Available</th>
                  <th style={{ textAlign: 'center' }}>Utilization</th>
                  <th style={{ textAlign: 'center' }}>Shipment</th>
                  <th style={{ textAlign: 'center' }}>Non-PO</th>
                  <th style={{ textAlign: 'center' }}>Move WH</th>
                  <th style={{ textAlign: 'center' }}>Hold</th>
                </tr>
              </thead>
              <tbody>
                {warehouseData.map(wh => {
                  const util = Math.round((wh.occupied / wh.total) * 100)
                  return (
                    <tr key={wh.id}>
                      <td className="font-bold text-blue-700 font-mono" style={{ textAlign: 'left' }}>WH {wh.id}</td>
                      <td className="font-semibold text-slate-800" style={{ textAlign: 'center' }}>{wh.occupied}</td>
                      <td className="font-semibold text-slate-800" style={{ textAlign: 'center' }}>{wh.available}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-full max-w-[70px] h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                util > 85 ? 'bg-red-500' : util > 60 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${util}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{util}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex w-full justify-center">
                          <span className="badge inline-flex min-w-[40px] justify-center bg-green-50 text-green-700 border-green-200">
                            {wh.shipment}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex w-full justify-center">
                          <span className="badge inline-flex min-w-[40px] justify-center bg-red-50 text-red-700 border-red-200">
                            {wh.nonPO}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex w-full justify-center">
                          <span className="badge inline-flex min-w-[40px] justify-center bg-amber-50 text-amber-700 border-amber-200">
                            {wh.moveWH}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex w-full justify-center">
                          <span className="badge inline-flex min-w-[40px] justify-center bg-blue-50 text-blue-700 border-blue-200">
                            {wh.hold}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs flex flex-col">
          <div className="pb-2.5 mb-3 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Operational Alerts</h3>
            <p className="text-[11px] text-slate-400">System warnings & required actions</p>
          </div>

          <div className="space-y-2.5">
            {alerts.slice(0, 3).map(alert => (
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

      <div className="grid grid-cols-1 min-[1180px]:grid-cols-[1fr_320px] gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Roll Demand Forecast</h3>
              <p className="text-[11px] text-slate-400">History + Demand forecast (rolls/month)</p>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 text-[11px] font-semibold">
              <TrendingUp size={13} />
              <span>Auto Forecast Active</span>
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
                <Line type="monotone" dataKey="forecast" stroke="#16A34A" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 3 }} name="Demand Forecast" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Warehouse Analysis</h3>
              <p className="text-[11px] text-slate-400">Summary of warehouse operations analysis</p>
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

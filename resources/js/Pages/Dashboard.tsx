import { AlertTriangle, CheckCircle, Info, XCircle, TrendingUp, Package, Weight, Boxes, BarChart2, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { usePage, router } from '@inertiajs/react'
import { motion } from 'framer-motion'
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
    { label: 'Total Rolls', value: stats.total_rolls.toLocaleString(), sub: 'in inventory', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-600', icon: Package },
    { label: 'Total Weight (kg)', value: stats.total_weight.toLocaleString(), sub: 'in warehouse', color: '#0ea5e9', bg: 'bg-sky-50', text: 'text-sky-600', icon: Weight },
    { label: 'Received Today', value: stats.received_today.toString(), sub: 'rolls', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: Boxes },
    { label: 'Active JOPs', value: stats.active_jops.toString(), sub: 'jobs', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600', icon: AlertTriangle },
    { label: 'Occupied Slots', value: stats.occupied_slots.toString(), sub: `of ${stats.total_slots} total`, color: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: BarChart2 },
    { label: 'Available Slots', value: stats.available_slots.toString(), sub: 'across all WH', color: '#14b8a6', bg: 'bg-teal-50', text: 'text-teal-600', icon: Boxes },
  ]

function AlertIcon({ type }: { type: string }) {
  if (type === 'error') return <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
  if (type === 'warning') return <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
  if (type === 'info') return <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
  return <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
}

const alertBg: Record<string, string> = {
  error: 'bg-red-50 border-red-100 text-red-800',
  warning: 'bg-amber-50 border-amber-100 text-amber-800',
  info: 'bg-blue-50 border-blue-100 text-blue-800',
  success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
}

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="py-4 px-2.5 sm:px-6 space-y-5 max-w-full overflow-x-hidden"
    >
      <motion.div variants={itemVariants}>
        <div className="mb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Operations Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time metrics & operational status</p>
        </div>

        <div className="grid grid-cols-2 min-[680px]:grid-cols-3 min-[920px]:grid-cols-4 min-[1180px]:grid-cols-5 gap-2.5">
          {kpis.map(kpi => {
            const Icon = kpi.icon
            return (
              <motion.div
                variants={itemVariants}
                key={kpi.label}
                className="glass-panel group rounded-xl p-3 cursor-default"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{kpi.label}</div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight mt-1 leading-none">
                      {kpi.value}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 mt-1 truncate">{kpi.sub}</div>
                  </div>
                  <div className={`w-7 h-7 rounded-lg ${kpi.bg} border border-white/50 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs`}>
                    <Icon size={14} className={kpi.text} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 min-[1180px]:grid-cols-[1fr_320px] gap-4">

        <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-3.5 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Warehouse Condition</h3>
              <p className="text-[11px] text-slate-500">Current occupancy & status by warehouse</p>
            </div>
            <button
              onClick={() => router.visit('/warehouse-map')}
              className="px-2.5 py-1.5 bg-white/80 hover:bg-white active:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
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
                    <tr key={wh.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="font-bold text-blue-600 font-mono" style={{ textAlign: 'left' }}>{String(wh.id).replace('Kolom', 'Column')}</td>
                      <td className="font-semibold text-slate-700" style={{ textAlign: 'center' }}>{wh.occupied}</td>
                      <td className="font-semibold text-slate-700" style={{ textAlign: 'center' }}>{wh.available}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-full max-w-[70px] h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
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
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-3.5 sm:p-5 flex flex-col">
          <div className="pb-2.5 mb-3 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-bold text-slate-800">Operational Alerts</h3>
            <p className="text-[11px] text-slate-500">System warnings & required actions</p>
          </div>

          <div className="space-y-2.5">
            {alerts.slice(0, 3).map(alert => (
              <motion.div
                whileHover={{ x: 3 }}
                key={alert.id}
                className={`p-2.5 rounded-xl border-l-4 ${alertBg[alert.type]} bg-white/50 backdrop-blur-md hover:backdrop-blur-xl border-t border-r border-b border-slate-100 hover:border-slate-200 flex items-start gap-2.5 shadow-sm hover:shadow-md transition-all cursor-default`}
              >
                <AlertIcon type={alert.type} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-800 truncate">{alert.title}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{alert.message}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">{alert.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 min-[1180px]:grid-cols-[1fr_320px] gap-4">
        <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-3.5 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Roll Demand Forecast</h3>
              <p className="text-[11px] text-slate-500">History + Demand forecast (rolls/month)</p>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 text-[11px] font-semibold">
              <TrendingUp size={13} />
              <span>Auto Forecast Active</span>
            </div>
          </div>

          <div className="w-full flex-1 min-h-[224px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandForecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ stroke: 'rgba(0, 0, 0, 0.1)', strokeWidth: 2, strokeDasharray: '4 4' }}
                  contentStyle={{ 
                    fontSize: 12, 
                    borderRadius: 12, 
                    border: '1px solid rgba(0,0,0,0.05)', 
                    boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: '#1e293b'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} name="Actual" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#16A34A" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 3 }} name="Demand Forecast" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-3.5 sm:p-5 flex flex-col">
          <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shadow-sm border border-blue-200">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Warehouse Analysis</h3>
              <p className="text-[11px] text-slate-500">Summary of warehouse operations analysis</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { icon: '📈', text: 'Demand is trending upward over the current period. An average 8.2% month-over-month increase has been observed since Q1.' },
              { icon: '👥', text: 'Customer order activity is increasing compared with the same period last year. Three key accounts are driving higher volume.' },
              { icon: '⚠️', text: 'Inventory pressure may increase over the next 60 days if current demand continues. Consider reviewing slot capacity for WH-C.' },
              { icon: '📦', text: 'Peak demand is projected in December. Production planning should account for a 22% volume increase vs current capacity.' },
            ].map((insight, i) => (
              <motion.div 
                whileHover={{ y: -1 }}
                key={i} 
                className="group flex gap-2.5 p-2.5 rounded-xl bg-slate-50/50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-default shadow-sm hover:shadow-md"
              >
                <span className="text-sm shrink-0 transition-transform duration-300 group-hover:scale-110">{insight.icon}</span>
                <p className="text-[11px] text-slate-600 leading-relaxed m-0">{insight.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-3.5 sm:p-5">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2">Warehouse Slot Distribution</h3>
        <div className="w-full h-48 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={warehouseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={0} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="id" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => String(v).replace('Kolom', 'Column')} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{ 
                  fontSize: 12, 
                  borderRadius: 12, 
                  border: '1px solid rgba(0,0,0,0.05)', 
                  boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#1e293b'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="occupied" stackId="a" fill="#3B82F6" name="Occupied" radius={[0, 0, 4, 4]} />
              <Bar dataKey="available" stackId="a" fill="#e2e8f0" name="Available" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  )
}

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { usePage } from '@inertiajs/react'
import { Search, Filter, Package } from 'lucide-react'

interface OutgoingRoll {
  id: number
  no_roll: string
  jop: string
  customer: string
  grade: string
  gsm: number | string
  weight: number
  entry_date: string
  status: string
}

export default function Reports() {
  const {
    warehouseData = [],
    demandForecast = [],
    statusDistribution = [],
    ocrActivity = [],
    kpis = [],
    outgoingRolls = []
  } = usePage<any>().props;

  const [outgoingSearch, setOutgoingSearch] = useState('')

  const filteredOutgoing = (outgoingRolls as OutgoingRoll[]).filter(r => {
    if (!outgoingSearch) return true
    const q = outgoingSearch.toLowerCase()
    return (
      r.no_roll.toLowerCase().includes(q) ||
      r.jop.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q) ||
      r.grade.toLowerCase().includes(q)
    )
  })

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Historical operational summary, OCR performance, and warehouse utilization</p>
      </div>

      {}
      <div className="grid grid-cols-2 min-[680px]:grid-cols-3 min-[1180px]:grid-cols-6 gap-2.5">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 truncate mb-1">{kpi.label}</div>
            <div className="text-xl font-extrabold text-blue-900 font-mono leading-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 min-[680px]:grid-cols-2 gap-4">
        {}
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

        {}
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

        {}
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

        {}
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

      {/* Outgoing Shipment Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Outgoing Shipment</h3>
              <p className="text-[11px] text-slate-500">Rolls with Shipment Plan status — linked to JOP orders, not yet assigned to warehouse slots</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">{filteredOutgoing.length} rolls</span>
        </div>

        {/* Search */}
        <div className="card p-3 sm:p-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:max-w-md">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={outgoingSearch}
              onChange={e => setOutgoingSearch(e.target.value)}
              placeholder="Search roll, JOP, customer, grade..."
              className="w-full min-w-0 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Outgoing Table */}
        <div className="card overflow-x-auto">
          <table className="data-table w-full min-w-[900px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[130px]" />
              <col className="w-[140px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[70px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Roll Number</th>
                <th style={{ textAlign: 'center' }}>JOP</th>
                <th style={{ textAlign: 'center' }}>Customer</th>
                <th style={{ textAlign: 'center' }}>Grade</th>
                <th style={{ textAlign: 'center' }}>GSM</th>
                <th style={{ textAlign: 'center' }}>Weight (kg)</th>
                <th style={{ textAlign: 'center' }}>Entry Date</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutgoing.length > 0 ? filteredOutgoing.map((r: OutgoingRoll) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.no_roll}</td>
                  <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.jop}</td>
                  <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{r.customer}</td>
                  <td className="font-semibold text-slate-800" style={{ textAlign: 'center' }}>{r.grade}</td>
                  <td style={{ textAlign: 'center' }}>{r.gsm}</td>
                  <td className="font-medium" style={{ textAlign: 'center' }}>{typeof r.weight === 'number' ? r.weight.toLocaleString('id-ID') : r.weight}</td>
                  <td className="text-slate-600" style={{ textAlign: 'center' }}>{r.entry_date}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      <span className="badge inline-flex justify-center px-2.5 py-1 text-xs font-semibold whitespace-nowrap rounded-md" style={{ backgroundColor: '#d4edda', color: '#3C763D' }}>
                        {r.status}
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No outgoing shipment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
